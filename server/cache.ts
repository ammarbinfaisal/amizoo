/**
 * Server-side response cache for Amizone data.
 *
 * Scraping Amizone is expensive: a cold go-amizone session costs a CapSolver
 * Turnstile solve plus a slow origin round trip. Caching here means a dashboard
 * load hits upstream once rather than once per widget.
 *
 * Backend selection is automatic:
 *   - Upstash / Vercel KV REST credentials present -> shared cache across
 *     serverless instances (what you want in production).
 *   - Otherwise an in-process Map, which is still effective within a warm
 *     Fluid Compute instance and works offline in development.
 *
 * Entries are namespaced per user. Cache failures are never fatal — a broken
 * cache degrades to hitting upstream, it does not break the request.
 */

export interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

const MEMORY_MAX_ENTRIES = 500;

class MemoryCache implements CacheBackend {
  private readonly store = new Map<string, MemoryEntry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.store.size >= MEMORY_MAX_ENTRIES) {
      // Map preserves insertion order, so the first key is the oldest write.
      const oldest = this.store.keys().next();
      if (!oldest.done) this.store.delete(oldest.value);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class UpstashCache implements CacheBackend {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  private async command<T>(args: (string | number)[]): Promise<T | null> {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { result?: T };
      return payload.result ?? null;
    } catch (error) {
      console.warn("[cache] upstash command failed", error);
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.command<string>(["GET", key]);
    if (typeof raw !== "string") return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.command(["SET", key, JSON.stringify(value), "EX", ttlSeconds]);
  }

  async delete(key: string): Promise<void> {
    await this.command(["DEL", key]);
  }
}

function createBackend(): CacheBackend {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (url && token) return new UpstashCache(url.replace(/\/+$/, ""), token);
  return new MemoryCache();
}

// Survive dev-server hot reloads so the cache is not wiped on every edit.
const globalForCache = globalThis as unknown as { __amizooCache?: CacheBackend };
export const cache: CacheBackend = (globalForCache.__amizooCache ??= createBackend());

/** TTLs in seconds, tuned to how often each resource actually changes. */
export const CACHE_TTL = {
  profile: 60 * 60 * 12,
  semesters: 60 * 60 * 6,
  attendance: 60 * 15,
  courses: 60 * 30,
  classSchedule: 60 * 60,
  examSchedule: 60 * 60 * 3,
  examResult: 60 * 60 * 6,
  wifiMac: 60 * 5,
} as const;

const KEY_VERSION = "v1";

/**
 * Namespaces a cache entry to one user. The username is hashed so it does not
 * sit in plaintext in the shared key space.
 */
export async function userCacheKey(
  username: string,
  resource: string
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(username)
  );
  const hash = Array.from(new Uint8Array(digest).slice(0, 8))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `amizoo:${KEY_VERSION}:${hash}:${resource}`;
}

interface CachedOptions<T> {
  username: string;
  resource: string;
  ttlSeconds: number;
  /** Skip the read (but still write) — backs the UI's pull-to-refresh. */
  fresh?: boolean;
  load: () => Promise<T>;
}

export async function cached<T>({
  username,
  resource,
  ttlSeconds,
  fresh,
  load,
}: CachedOptions<T>): Promise<T> {
  const key = await userCacheKey(username, resource);

  if (!fresh) {
    try {
      const hit = await cache.get<T>(key);
      if (hit !== null) return hit;
    } catch (error) {
      console.warn("[cache] read failed", error);
    }
  }

  const value = await load();

  try {
    await cache.set(key, value, ttlSeconds);
  } catch (error) {
    console.warn("[cache] write failed", error);
  }

  return value;
}

export async function invalidate(
  username: string,
  resources: string[]
): Promise<void> {
  await Promise.all(
    resources.map(async (resource) => {
      try {
        await cache.delete(await userCacheKey(username, resource));
      } catch (error) {
        console.warn("[cache] invalidate failed", error);
      }
    })
  );
}
