/**
 * /api/map-auth – server-side secret gating for the /map prototype.
 *
 * Checks for the MAP_VIEW_SECRET environment variable and validates either:
 *   - the "X-MAP-SECRET" request header, or
 *   - the "map_secret" cookie
 *
 * Returns:
 *   200 { ok: true }  – valid secret
 *   401 { ok: false } – missing or invalid secret
 *   500 { ok: false } – MAP_VIEW_SECRET not configured in the environment
 *
 * IMPORTANT: Do NOT add secret values to this file or to the repository.
 * Set MAP_VIEW_SECRET via:
 *   - Local:          .env.local  →  MAP_VIEW_SECRET=<strong-random-value>
 *   - Cloudflare:     wrangler secret put MAP_VIEW_SECRET
 *   - Vercel:         Project > Settings > Environment Variables
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const envSecret = process.env.MAP_VIEW_SECRET;

  if (!envSecret) {
    console.error(
      "[map-auth] MAP_VIEW_SECRET is not set. " +
        "Configure it in .env.local (development) or as a deployment secret."
    );
    return NextResponse.json(
      {
        ok: false,
        error:
          "MAP_VIEW_SECRET is not configured on the server. " +
          "Set it in your deployment environment before using the map.",
      },
      { status: 500 }
    );
  }

  // Accept the secret from the X-MAP-SECRET header or a map_secret cookie.
  const headerSecret = request.headers.get("x-map-secret");
  const cookieSecret = request.cookies.get("map_secret")?.value;
  const provided = headerSecret ?? cookieSecret ?? null;

  if (!provided || provided !== envSecret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Valid X-MAP-SECRET header or map_secret cookie required." },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
