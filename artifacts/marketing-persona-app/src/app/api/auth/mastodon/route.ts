import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { startMastodonOAuth } from "@/lib/integrations/social-oauth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const projectId = Number(url.searchParams.get("projectId"));
  const instance = url.searchParams.get("instance")?.trim();

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
  }
  if (!instance) {
    return NextResponse.json({ error: "instance query param is required (e.g. mastodon.social)" }, { status: 400 });
  }

  try {
    await startMastodonOAuth(projectId, userId!, instance);
    return NextResponse.json({ error: "Unexpected return from OAuth" }, { status: 500 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mastodon OAuth failed" },
      { status: 503 },
    );
  }
}
