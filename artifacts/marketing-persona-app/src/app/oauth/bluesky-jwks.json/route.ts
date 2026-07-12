import { NextResponse } from "next/server";
import { getBlueskyJwks } from "@/lib/bluesky-oauth";
import { getNextApiOrigin } from "@/lib/social-oauth";

export async function GET() {
  try {
    const jwks = await getBlueskyJwks(getNextApiOrigin());
    return NextResponse.json(jwks, {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bluesky OAuth not configured" },
      { status: 503 },
    );
  }
}
