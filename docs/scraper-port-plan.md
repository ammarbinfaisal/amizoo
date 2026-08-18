# Plan: port the go-amizone scraper into amizoo as TypeScript

## Context

Today: `browser → /api/trpc (Vercel) → go-amizone (Fly.io) → s.amizone.net`.

Stage 1 put a tRPC BFF in front of the Go service — credentials moved into an
encrypted httpOnly cookie, responses gained a server-side cache — but the
scraper is still Go on Fly. This plan removes that hop so the whole app runs on
Vercel.

Target:

```
browser → /api/trpc (Vercel) → s.amizone.net
                             ↘ Upstash Redis  (cookie jar, login lock, response cache)
                             ↘ CapSolver      (Turnstile solves)
```

### Decisions taken
- **Big-bang cutover** — all endpoints in one branch, verified on a preview, then merged. No per-endpoint fallback flag.
- **Upstash Redis via Vercel Marketplace** (injects `KV_REST_API_*`, which `server/cache.ts` already reads).
- **CapSolver only** — the Playwright `browser-login/` service is dropped.

---

## Phase 0 — the TLS spike. Gate everything on this.

`server/session_cache.go:122` builds every client with `amizone.WithTLSClient(nil)`,
and `amizone/tlsclient/client.go` rotates JA3/JA4 browser profiles. Node's
`undici` cannot do that, and there is no serverless-compatible npm equivalent.

I probed `s.amizone.net` from this machine and found no WAF — bare IIS/ASP.NET,
plain `curl` gets 200 and real session cookies, and the Turnstile is an ordinary
widget in the login form rather than an edge interstitial. That is good
evidence, but it is one IP, and it is not the basis on which to commit to a
cutover with no fallback. Someone added that TLS layer for a reason.

**Spike (~1 day, hard go/no-go).** A throwaway `app/api/_spike/route.ts` on a
Vercel **preview** — not localhost, since Vercel's egress IPs and TLS stack are
the whole question — doing, with plain `fetch`: GET `/` → parse hidden fields →
CapSolver solve → POST `/` → GET `/Home` → assert the attendance widget renders.

If plain `fetch` is rejected where the Go TLS client succeeds, the answer is not
to port harder: keep a ~200-line Go login-only service on Fly that returns the
three cookies, and port only the scraping. Decide that **before** writing 1,500
lines of parser.

While you are in there, save the live login page HTML — you will need it, see §4.

---

## 1. Module layout

Everything new under `server/amizone/`. Critically, **`server/amizone-api.ts`
keeps its current exports** (`AmizoneApiError`, `amizoneRequest(path, session, opts)`)
and becomes a path-dispatch shim onto the new client.

That keeps the diff in `server/trpc/routers/amizone.ts` at **zero** — cache
keys, TTLs, invalidations and arktype inputs are provably unchanged — and lets
the parity harness call one function against both implementations. Refactor to
typed methods *after* parity is green, so a type change can never be mistaken
for a data change in review.

```
server/amizone/
  config.ts        endpoint constants (mirror amizone.go:29-55), UA, TTLs, env assertions
  errors.ts        AmizoneApiError
  client.ts        AmizoneClient — one per invocation; 13 methods mirroring amizone.go
  http.ts          doRequest: headers, manual redirect loop, body buffering, retry
  cookie-jar.ts    getSetCookie() parsing, serialization, isLoggedIn(jar)
  login.ts         the amizone.go:233-389 orchestration
  capsolver.ts     createTask / getTaskResult polling
  session-store.ts Redis session record, distributed lock, throttle
  go-compat/       atoi.ts float.ts time.ts url.ts text.ts   ← bug-compatible by design
  parse/           dom.ts + one module per Go parser
  wire/            to-wire.ts — replicates toproto/to.go + EmitUnpopulated
  __fixtures__/    copied from go-amizone, filenames preserved
  __tests__/
```

The one router change: delete the `wifiInfo` procedure. `/api/v1/wifi_mac_address`
is not among the 13 patterns the gateway registers — verified against the live
backend, it returns `{"code":5,"message":"Not Found"}`. The dashboard's fallback
path has been failing silently all along.

---

## 2. Session, lock, throttle

`uid = sha256(username + ":" + password)` — must include the password, because
Go's `SessionCache.makeKey` does, so a password change self-invalidates. The
password itself never enters Redis.

| Key | Value | TTL |
| --- | --- | --- |
| `amizoo:sess:v1:{uid}` | `{cookies, loginAt}` | 3600s |
| `amizoo:lock:v1:{uid}` | random token | **20s, heartbeated** |
| `amizoo:attempt:v1:{uid}` | epoch ms | 120s (Go's anti-hammer window) |
| `amizoo:forced:v1:{uid}` | counter | 600s |

**`server/cache.ts` needs three new atomic ops** on `CacheBackend`:
`setIfAbsent` (`SET NX EX`), `deleteIfMatch` (compare-and-delete via `EVAL`),
`touch` (`EXPIRE`). Upstash REST supports all three.

⚠️ `createBackend()` currently falls back to `MemoryCache` when Upstash creds are
absent. For a response cache that is graceful degradation; **for a distributed
lock it is a silent correctness failure.** Add a boot assertion: production
without Upstash must throw. Also do not route the session record through
`cached()` — that helper swallows every error, which is right for responses and
wrong for auth state.

**Leader:** acquire lock → *re-read the session* (one may have landed between
your miss and your acquire) → check throttle → `SET attempt` **before any
network I/O** (Go sets `lastAttempt` before `GET /`, so a crashed attempt still
costs the cool-off, which is the intended behaviour) → start an 8s heartbeat →
login → write the session **immediately after the login POST**, before any
downstream scrape → release in a `finally`.

**Waiters poll; they do not fail fast.** The dominant case is a dashboard cold
load firing five parallel tRPC queries at once — failing four of them produces a
visibly broken dashboard for a user who did nothing wrong. Back off
`300/500/800/1200/1500…`ms, budget 45s for `auth.login` (user is watching a
spinner) and 20s for background queries, then a 503. A waiter never starts its
own solve.

**Forced re-login needs a cap that Go lacks.** `login(true)` skips both the
reuse check and the throttle, so a permanently-broken session (password changed
upstream, account locked) is an unbounded CapSolver spend loop. `INCR forced:{uid}`,
refuse above 3, throw 401 so `fromAmizone` clears the cookie. Deliberate
deviation — document it.

**On Upstash failure, fail open.** A duplicate solve costs $0.001; a hard outage
costs the app.

### `maxDuration = 60` is not viable

Worst case: Amizone TTFB 2–10s + solve 10–60s + POST + redirects + the actual
scrape. And the failure mode compounds — Vercel kills the leader, the `attempt`
key survives 120s, so **the user is locked out for two minutes after every
timed-out solve**, and the retry times out identically.

1. **Raise `maxDuration` to 300** in `app/api/trpc/[trpc]/route.ts` and bump the timeouts in `server/config.ts` together. Confirm the plan tier allows it.
2. **Lock TTL 20s with a heartbeat — shorter than `maxDuration`, not longer.** A lock outliving the function guarantees a tombstone; a short heartbeated lock self-heals. This is the difference between "one slow login" and "this user is stuck".
3. **Budget the solve with an `AbortSignal`** derived from a request-entry deadline, so the leader gives up cleanly — writing nothing, releasing the lock — rather than being killed mid-flight.

---

## 3. HTTP client

**Manual redirect handling is mandatory.** This is the biggest non-obvious
hazard in the port. The login POST returns **302 with the three `Set-Cookie`
headers on the redirect response**. With `redirect: "follow"` you never see
intermediate responses, so you never see the auth cookies and **login silently
never works** — presenting as "invalid credentials". Go's `http.Client` handles
this via its jar; `fetch` will not. Implement `redirect: "manual"`, max 10 hops,
harvesting cookies at every hop, for *all* requests — Amizone rotates
`__RequestVerificationToken` on redirects too. The final URL also replaces Go's
invalid-credential check (`pathname === "/"` ⇒ bad credentials).

**Use `response.headers.getSetCookie()`**, never `headers.get("set-cookie")` —
the latter joins multiple headers with `", "`, which is unparseable once any
cookie carries an `Expires=Wed, 21 Oct…` value. Node runtime only, not Edge.

**Headers** (`requests.go:61-73`): the Firefox UA, `Referer: https://s.amizone.net/`,
`Origin: https://s.amizone.net`, the serialized jar, and `Content-Type:
application/x-www-form-urlencoded` on POSTs. Nothing else — Go sets no `Accept`,
and adding one is a gratuitous fingerprint change.

**Body is `string | undefined`** throughout. A string is inherently re-sendable,
which fixes the latent Go bug at `requests.go:111` (the retry passes an
already-consumed reader, so retried POSTs silently send an empty body) by
construction rather than by discipline.

**Logged-out detection:** regex `/id\s*=\s*["']?loginform/i` as a fast path —
it can only produce a false *"logged out"*, which falls through to an
authoritative cheerio check, so it is exact while avoiding parse5-ing a 197KB
page twice per request. On detection: drop the session, force re-login, retry
**exactly once**.

Write the jar back to Redis only when an auth cookie actually changed, not after
every request.

---

## 4. Parsers

**cheerio v1 with the default parse5 backend** — the goquery port becomes
near-mechanical, css-select supports the `:contains()` the exam-schedule parser
uses, and parse5 is an HTML5-spec parser like Go's `net/html`, so malformed
ASP.NET markup yields the same tree. Not node-html-parser (no `:contains`,
different `.text()` semantics — you would be rewriting, not porting). Do not
pass `{ htmlparser2: true }`; the fixtures are fragments and it changes fragment
handling. **html-entities** for unescaping. **No `sanitize-html`** — bluemonday
with an empty policy is just "strip every tag, keep text", i.e. remove
`script, style` then `.text()`.

### The five compatibility primitives — where silent corruption lives

**`time.ts` — fake UTC.** Go's `time.Parse` with zone-less layouts yields UTC,
so IST wall-clock strings become fake-UTC (`2022-05-11T10:00:00Z` means 10:00
IST) and the frontend compensates by string-slicing. Hand-roll all four layouts
with anchored regexes and **return an ISO string directly, never a `Date`** —
the moment a `Date` exists the host timezone can leak in. Note two *different*
zero values: class schedule fails to `1970-01-01` (`time.Unix(0,0)`), everything
else to `0001-01-01` (which is where `{"year":1,"month":1,"day":1}` comes from).

**`float.ts` — the bug most likely to ship.** `Math.fround(20.4)` is
`20.399999618530273`, and `JSON.stringify` emits exactly that. **Go's protojson
emits `20.4`** — shortest decimal that round-trips as float32. Every
`Marks.have/max` and every SGPA/CGPA would differ on the wire. Needs
`formatFloat32ForJSON(v)`: for `p` in 1..9, take `Number(v.toPrecision(p))`,
return the first where `Math.fround(that) === v` — and the wire serializer must
use a custom replacer rather than raw `JSON.stringify`. **No parser test catches
this; only a byte-level wire comparison does.**

**`atoi.ts`.** `strconv.Atoi(" 100 ")` errors → Go returns `0`; `parseInt` returns
`100`. The exam-result parser calls it on *un-cleaned* cell text, so padded cells
yield `0` upstream today. Implement strictly (`/^[+-]?\d+$/` else `0`). Resist
"fixing" it — that is a data change, and belongs in a separate post-cutover commit.

**`url.ts`.** `goQueryEscape` = `encodeURIComponent`, then encode the `!'()*` it
leaves alone, then `%20`→`+`. `goEncodeValues` sorts keys. Pinned by
`expected__faculty_feedback_spec.json`, where `CourseType` is `"Open%2FDomain%2FFBL"`.

**`text.ts`.** `cleanString` = unescapeUnicode → htmlUnescape → stripAllTags →
htmlUnescape → trim → trim(set) → trim. The double decode is what preserves a
bare `&` in faculty names. It runs on nearly every table cell, so add a fast
path: no `<` and no `&` ⇒ just trim. Also `titleCaseEnglish` for the exam title —
verified that `\p{L}[\p{L}\p{M}\p{Nd}'’]*` word-casing reproduces the golden.

### `parse/dom.ts` shims

`containsOwn()` — goquery's `:containsOwn` has no cheerio equivalent, and plain
`:contains` is *not* the same (it matches descendants). Filter on the
concatenation of direct child text nodes only. It matters: the dashboard fixture
has nine `.widget-header` elements. Plus `brToNewline()`, `dataCell()`,
`normalisePage()`.

### Order

`go-compat` + `dom.ts` → `logged-in` → `verification-token` → `login-form` →
`class-schedule` (pure JSON; exercises fake-UTC, sort, filter) → `attendance`
(exercises `containsOwn` on the 197KB page) → `sem-count` → `wifi` →
`exam-result` (exercises atoi, float32, `{year,month,day}`) → `courses` →
`exam-schedule` → `profile` → *(faculty feedback deferred, §7)*

⚠️ **`login_page.html` is a stale fixture** — it carries a reCAPTCHA `sitekey=`
*attribute*, while `login_form.go:57` scans `<script>` bodies for the literal
`sitekey: "`. So it yields an empty Turnstile key and exercises no CAPTCHA path
at all. Use the live page captured in Phase 0.

---

## 5. Tests

**Add vitest** (`environment: 'node'`, `include: ['server/**/*.test.ts']`). There
is no unit runner today. Playwright stays for e2e. Don't chain vitest into
`build` — a flaky test shouldn't break a deploy.

Copy the 14 fixtures and 2 goldens from `go-amizone/amizone/internal/mock/testdata/`,
preserving filenames, with a README recording the upstream SHA. ~330KB. Don't
symlink a sibling repo — CI and Vercel can't see it.

**Tier 1 — ported unit tests.** Mechanically port every Go assertion. The two
goldens pin the hardest parsers to bytes the Go implementation produced. Note
they are Go `encoding/json` of the *models* — PascalCase keys — not protojson,
so they need a separate `toGoJSON` helper, not the wire serializer.

**Tier 2 — wire parity. This is the cutover gate.** With no fallback flag it is
the only safety net.

- `scripts/capture-golden.ts` — hit all 13 endpoints on `amizone.fly.dev` with a real account, save raw bodies. **`.gitignore` these** — real names and enrollment numbers.
- `scripts/capture-pages.ts` — run the new client against live Amizone once, dumping every raw upstream HTML/JSON response.
- `parity.test.ts` — feed those dumps through the new parsers **offline** and diff against the Go capture.

Offline replay matters: live-vs-live is a trap, because attendance counts move
between the two captures and you end up debugging real data changes. Assert both
a deep-equal **and** a key-sorted `JSON.stringify` — only the string comparison
catches the float32 formatting problem.

**Tier 3 — session/lock against an in-memory backend and a fake clock:** single
leader wins; N−1 waiters get the leader's session; leader crash → lock expires →
next caller leads; throttle blocks a second attempt; throttle *with* an existing
session reuses rather than errors; forced-relogin cap trips at 3. Plus `http.ts`
against a stubbed fetch: one re-login and one retry (never two), retried POST
re-sends an identical body, 302-with-cookies is harvested correctly.

---

## 6. Cutover

Phase 0 spike → Phase 1 parsers offline → Phase 2 session/lock/HTTP → Phase 3
wire layer + swap `amizone-api.ts` body → Phase 4 parity → Phase 5 preview soak.

### CapSolver key

Both systems need a working key during the parity window, and the old key is
live in Fly secrets. Two options:

- **Two keys (recommended).** Create a second key `amizoo-vercel` for Vercel, leave Fly's alone. Per-key spend in the CapSolver dashboard then tells you exactly which system is solving — that attribution is the main argument. Revoke the old key at the very end.
- **Rotate first (as originally asked).** Then Fly must get the new key *before* anything else moves, or the live app breaks the moment the old key dies: `fly secrets set` → confirm the live app works → then add to Vercel.

Then: merge → watch 24h → leave Fly **running** a soak week (cheap, and it is
the rollback target) → `flyctl scale count 0` → wait → unset secret → revoke old
key → `flyctl apps destroy`. **Remove `AMIZONE_API_URL` from Vercel last** —
while it is present, `vercel rollback` is a working escape hatch.

Archive the `go-amizone` repo rather than deleting it. It is the reference
implementation and the fallback if Amizone ever puts a WAF in front of the
portal, at which point the uTLS layer becomes load-bearing again.

### Env, final state

`SESSION_SECRET` (existing) · `CAPSOLVER_API_KEY` (**new, required**) ·
`KV_REST_API_URL`/`_TOKEN` (**now required in production** — the lock is not
optional) · `AMIZONE_BASE_URL` (optional, lets tests point at a mock) ·
throttle/TTL tunables · `AMIZONE_API_URL` (delete last). Leave `runtime` unset —
Node, not Edge: `getSetCookie()`, the parse5 bundle and Edge's limits all point
the same way.

---

## 7. Risks, and what to cut

**Ranked risks**

1. **TLS fingerprinting** — existential. Phase 0 settles it.
2. **`maxDuration` vs solve latency** — 60s is not enough and the failure compounds into a 2-minute per-user lockout.
3. **float32 wire formatting** — silent numeric corruption in marks and GPAs, invisible to every parser test.
4. **Fake-UTC** — silent 5:30 shift; mitigated structurally by never constructing a `Date`.
5. **`getSetCookie()` + manual redirects** — get either wrong and login simply never works, presenting as "invalid credentials".
6. **Redis as a new SPOF** — decided: fail open.
7. **Cost blowup** if `uid` is unstable. Add `INCR amizoo:metrics:solves:<date>` and alert above ~2× DAU. Expected direction is *down* — shared cookies in Redis beat Go's per-instance 30-minute cache.
8. **PII in wire fixtures** — gitignore them.
9. **Observability loss** — 444 lines of OTel/Prometheus have no replacement. Accept it; log structured lines keyed on the uid hash.

### Cut: faculty feedback. Strongly.

~390 lines across two files, the only parser needing a hand-rolled JS-call
tokenizer plus regex-over-serialized-HTML, and its correctness depends on
byte-exact Go query encoding — the fiddliest surface in the project.

But the real argument is risk shape: it is a **write to a system of record**,
fanned out in parallel across N faculties, whose failure mode is submitting
garbage feedback under the user's identity with no undo. That is categorically
different from the twelve read-only endpoints. It is only usable during a
feedback window that is closed most of the year, so an outage is invisible. Its
own author calls it a hack. And the asymmetry that clinches it: the golden pins
the *spec* parser, but `faculty_feedback_form.go` — the half that builds the
payload actually POSTed — has **no golden**, only one inline test.

On the cutover branch, `submitFacultyFeedback` throws `PRECONDITION_FAILED`
("temporarily unavailable while we move off the old backend") and the feedback
tab shows that copy. Port it later on its own branch, gated by a golden, with a
dry-run mode that logs the payload without POSTing. Removes ~25% of the parser
work and most of the irreversible-damage risk.

**Also cut:** `wifiInfo` (dead endpoint), phantom `Exam`/`ExamSchedule` types,
`payload_templates.go` (unreferenced), `browser-login/`, TLS profile rotation,
OTel/Prometheus.

**Do not cut:** the `overrideLimit` MAC bypass; the `removeWifiMac` parameter
quirk (the endpoint really does take username-in-`Amizone_Id` and MAC-in-`username`);
and above all the Tier 2 parity harness.

**Sequence the `lib/types.ts` tightening separately** — `cancelled`, `title` and
`publishDate` are typed optional but `EmitUnpopulated` guarantees they are always
present (`location?` is genuinely optional and stays). Do it *after* parity is
green, as its own commit.
