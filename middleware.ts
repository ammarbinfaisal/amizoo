import { NextResponse, type NextRequest } from "next/server";

/**
 * Presence check only — the cookie is not decrypted here, so this stays cheap.
 * Real verification happens in the tRPC layer, which clears the cookie if the
 * credentials are rejected upstream.
 */
const SESSION_COOKIE = "amizone_session";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/schedule";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
