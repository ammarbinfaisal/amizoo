import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";

import {
  LEGACY_AUTH_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  USER_COOKIE,
  sessionSecret,
} from "./config";

export interface Session {
  username: string;
  password: string;
}

/**
 * The Amizone password has to survive round trips in recoverable form: go-amizone
 * needs it to re-login whenever the upstream ASP.NET session expires. So the cookie
 * is *encrypted* (A256GCM via `dir`), not hashed, and is httpOnly so client JS can
 * never read it back out.
 */
let cachedKey: Promise<Uint8Array> | null = null;

function encryptionKey(): Promise<Uint8Array> {
  cachedKey ??= crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(sessionSecret()))
    .then((digest) => new Uint8Array(digest));
  return cachedKey;
}

export async function sealSession(session: Session): Promise<string> {
  return new EncryptJWT({ u: session.username, p: session.password })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .encrypt(await encryptionKey());
}

export async function openSession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtDecrypt(token, await encryptionKey());
    const { u, p } = payload as { u?: unknown; p?: unknown };
    if (typeof u !== "string" || typeof p !== "string" || !u || !p) return null;
    return { username: u, password: p };
  } catch {
    // Tampered, expired, or encrypted under a rotated secret.
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? openSession(token) : null;
}

export async function writeSession(session: Session): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";

  store.set(SESSION_COOKIE, await sealSession(session), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // Username only. Lets the client label the UI and namespace its offline cache
  // without ever holding the password.
  store.set(USER_COOKIE, session.username, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  store.delete(LEGACY_AUTH_COOKIE);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(USER_COOKIE);
  store.delete(LEGACY_AUTH_COOKIE);
}
