import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { startMetaOAuth } from "@/lib/social-oauth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number(new URL(req.url).searchParams.get("projectId"));
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
  }

  try {
    startMetaOAuth(projectId, userId!);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Meta OAuth failed" },
      { status: 503 },
    );
  }
}
