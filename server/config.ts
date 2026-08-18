/**
 * Server-only configuration for the Amizoo BFF.
 *
 * The browser never talks to the go-amizone API directly any more — every call
 * goes through the tRPC router in this directory, which holds the credentials
 * and applies caching. That makes this a server-to-server address: it is read
 * only inside Vercel Functions, never shipped to the client, so it is
 * deliberately not a NEXT_PUBLIC_ variable.
 */

const DEV_SESSION_SECRET = "amizoo-development-only-session-secret";

function resolveApiUrl(): string {
  const raw =
    process.env.AMIZONE_API_URL ??
    // api.ami.zoo.fullstacktics.com (the previous client-side default) no longer
    // resolves; this is the live Fly deployment from go-amizone's fly.toml.
    "https://amizone.fly.dev";
  const withScheme = raw.startsWith("http") ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

/** Base URL of the go-amizone HTTP API. */
export const AMIZONE_API_URL = resolveApiUrl();

/**
 * Secret used to derive the AES key that encrypts the credential cookie.
 * Falls back to a fixed dev value locally so `next dev` works unconfigured,
 * but is mandatory in production — the cookie holds a plaintext password.
 */
export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters in production. " +
        "Generate one with: openssl rand -base64 48"
    );
  }
  return DEV_SESSION_SECRET;
}

/** Encrypted credential cookie. httpOnly — never readable by client JS. */
export const SESSION_COOKIE = "amizone_session";
/** Username-only cookie, readable by client JS so the UI can key its offline cache. */
export const USER_COOKIE = "amizone_user";
/** Cookie written by the pre-tRPC implementation; cleared on sign-in/out. */
export const LEGACY_AUTH_COOKIE = "amizone_auth";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 1 week

/**
 * Amizone itself is slow (2-10s TTFB observed) and go-amizone may transparently
 * re-login — which includes a CapSolver Turnstile solve — on a cold session.
 * Both ceilings must stay below the route handler's maxDuration.
 */
export const AMIZONE_REQUEST_TIMEOUT_MS = 45_000;
export const AMIZONE_LOGIN_TIMEOUT_MS = 55_000;
