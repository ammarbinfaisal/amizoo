import { AMIZONE_API_URL, AMIZONE_REQUEST_TIMEOUT_MS } from "./config";
import type { Session } from "./session";

export class AmizoneApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AmizoneApiError";
  }
}

/**
 * UTF-8 safe Basic auth encoding. `btoa` alone throws on any password
 * containing a character outside latin1.
 */
function basicAuth({ username, password }: Session): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Calls the go-amizone HTTP API with the caller's credentials.
 *
 * go-amizone keeps its own logged-in session pool, so most calls are a plain
 * proxied scrape; only a cold session pays for a login + CAPTCHA solve.
 */
export async function amizoneRequest<T>(
  path: string,
  session: Session,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    timeoutMs = AMIZONE_REQUEST_TIMEOUT_MS,
  } = options;

  const headers: Record<string, string> = {
    Authorization: `Basic ${basicAuth(session)}`,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${AMIZONE_API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new AmizoneApiError(
        "Amizone took too long to respond. It is often slow around results day — try again shortly.",
        504
      );
    }
    throw new AmizoneApiError(
      error instanceof Error ? error.message : "Could not reach the Amizone API",
      502
    );
  }

  if (response.status === 401) {
    throw new AmizoneApiError("Invalid Amizone credentials", 401);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new AmizoneApiError(
      detail.trim() || `Amizone API error (${response.status})`,
      response.status
    );
  }

  // Mutations (wifi register/deregister) reply with an empty body.
  const text = await response.text();
  if (!text.trim()) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AmizoneApiError("Amizone API returned a malformed response", 502);
  }
}
