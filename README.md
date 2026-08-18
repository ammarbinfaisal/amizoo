# Amizoo

A Next.js PWA front-end for Amizone, with a tRPC backend-for-frontend that holds
credentials server-side and caches upstream responses.

## Architecture

```
browser ──► /api/trpc (this app, on Vercel) ──► go-amizone ──► s.amizone.net
            · credentials in an encrypted        · session pool
              httpOnly cookie                    · CapSolver Turnstile
            · per-user response cache
```

The browser never sees the Amizone password and never talks to go-amizone
directly. Signing in POSTs the credentials once to `auth.login`, which verifies
them against Amizone and then seals them into an `amizone_session` cookie
(A256GCM, httpOnly). Every later request rides on that cookie.

A second cookie, `amizone_user`, holds the username only. It is readable by
client JS so the UI can label itself and namespace its offline cache.

### Layout

| Path | Role |
| --- | --- |
| `server/config.ts` | Env resolution, cookie names, upstream timeouts |
| `server/session.ts` | Seals/opens the encrypted credential cookie |
| `server/amizone-api.ts` | Typed HTTP client for go-amizone |
| `server/cache.ts` | Per-user response cache (Upstash REST, else in-memory) |
| `server/trpc/routers/` | `auth` and `amizone` procedures |
| `app/api/trpc/[trpc]/` | Fetch-adapter route handler |
| `lib/api.ts` | Client wrapper + localStorage offline mirror |
| `middleware.ts` | Cookie-presence gate on `/dashboard` and `/login` |

### Caching

Two independent layers:

1. **Server cache** (`server/cache.ts`), keyed by a hash of the username. TTLs
   live in `CACHE_TTL` and are tuned per resource — attendance 15 min, profile
   12 h, and so on. Passing `fresh: true` (the UI's refresh button) bypasses the
   read but still writes. Wi-Fi mutations invalidate the Wi-Fi entries.
2. **Offline mirror** (`lib/api.ts`), a localStorage copy of the last successful
   response, used when the device is offline or a request fails. The service
   worker additionally caches the tRPC GETs — which is why the client uses
   `httpLink` rather than `httpBatchLink`, so each query has a stable URL.

## Environment

See `.env.example`. `SESSION_SECRET` is mandatory in production — it encrypts a
cookie containing a real password; the app refuses to start a session without
it. Locally it falls back to a fixed development value.

Without `UPSTASH_REDIS_REST_URL` / `_TOKEN` the cache degrades to an in-process
Map. That still helps inside a warm Fluid Compute instance, but is not shared
across invocations, so provision Redis for production.

## Development

```bash
bun install
bun dev
```

`next build` uses webpack (`--webpack`) because `next-pwa` is a webpack plugin.

## Deploying to Vercel

Set `SESSION_SECRET`, `AMIZONE_API_URL`, and the Upstash pair in project env
vars. `app/api/trpc/[trpc]/route.ts` sets `maxDuration = 60`, which is the
ceiling that is safe on every plan. Amizone is slow and a cold go-amizone
session adds a CapSolver Turnstile solve on top, so if logins get cut off,
enable Fluid Compute and raise both that value and the timeouts in
`server/config.ts`.

go-amizone itself is **not** deployable to Vercel as-is: it keeps logged-in
sessions in process memory (`server/session_cache.go`), which serverless has no
equivalent for. It stays on Fly.io. Porting the scraper into this app is
possible later — Amizone has no WAF, so the uTLS layer in go-amizone is not
load-bearing — but it requires moving that session cache into Redis first.
The tRPC layer here is the seam that would let that happen one procedure at a
time.
