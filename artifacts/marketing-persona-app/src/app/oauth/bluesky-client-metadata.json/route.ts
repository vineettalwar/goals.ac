import { NextResponse } from "next/server";
import { getBlueskyClientMetadata } from "@/lib/integrations/bluesky-oauth";
import { getNextApiOrigin } from "@/lib/integrations/social-oauth";

export async function GET() {
  try {
    const metadata = await getBlueskyClientMetadata(getNextApiOrigin());
    return NextResponse.json(metadata, {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bluesky OAuth not configured" },
      { status: 503 },
    );
  }
}
