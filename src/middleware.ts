/**
 * Next.js Edge Middleware – protects the /map route.
 *
 * When a request arrives for /map (or any path under /map), this middleware
 * checks for the MAP_VIEW_SECRET environment variable and validates either:
 *   - the "X-MAP-SECRET" request header, or
 *   - the "map_secret" cookie
 *
 * If the secret is missing or invalid the request is redirected to /map/unauthorized
 * (a lightweight static error page). API requests (Accept: application/json)
 * receive a 401 JSON response instead.
 *
 * IMPORTANT: Do NOT add secret values to this file or to the repository.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequiredEnv, logSecurityEvent } from "@/lib/security";

export const config = {
  matcher: ["/map", "/map/:path*"],
};

/**
 * Constant-time string comparison to prevent timing-based secret inference.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const len = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

export function middleware(request: NextRequest): NextResponse {
  const envSecret = getRequiredEnv("MAP_VIEW_SECRET");

  // If MAP_VIEW_SECRET is not configured let the request through to the page
  // which will render its own "secret not configured" error UI.  This avoids
  // a hard redirect loop during initial setup.
  if (!envSecret) {
    logSecurityEvent({
      event: "map_secret_missing",
      level: "warn",
      path: request.nextUrl.pathname,
      message: "MAP_VIEW_SECRET is not configured.",
    });
    return NextResponse.next();
  }

  // Skip the middleware for the /map/unauthorized error page itself so we
  // don't create a redirect loop.
  if (request.nextUrl.pathname === "/map/unauthorized") {
    return NextResponse.next();
  }

  const headerSecret = request.headers.get("x-map-secret");
  const cookieSecret = request.cookies.get("map_secret")?.value;
  const provided = headerSecret ?? cookieSecret ?? null;

  if (!provided || !timingSafeEqual(provided, envSecret)) {
    logSecurityEvent({
      event: "map_access_denied",
      level: "warn",
      path: request.nextUrl.pathname,
      message: "Invalid map access secret provided.",
      metadata: {
        method: request.method,
        hasHeaderSecret: Boolean(headerSecret),
        hasCookieSecret: Boolean(cookieSecret),
      },
    });
    const acceptHeader = request.headers.get("accept") ?? "";
    if (acceptHeader.includes("application/json")) {
      return new NextResponse(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/map/unauthorized";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
