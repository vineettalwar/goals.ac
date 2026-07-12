import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { startBlueskyAuthorize } from "@/lib/bluesky-oauth";

function encodeState(payload: { projectId: number; userId: number }): string {
  return Buffer.from(JSON.stringify({ ...payload, platform: "bluesky" })).toString("base64url");
}

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const projectId = Number(url.searchParams.get("projectId"));
  const handle = url.searchParams.get("handle")?.trim();

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ error: "handle query param is required (e.g. you.bsky.social)" }, { status: 400 });
  }

  try {
    const state = encodeState({ projectId, userId: userId! });
    const authorizeUrl = await startBlueskyAuthorize(handle, state);
    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bluesky OAuth failed" },
      { status: 503 },
    );
  }
}
