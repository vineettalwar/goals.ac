import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { startLinkedInOAuth } from "@/lib/integrations/social-oauth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number(new URL(req.url).searchParams.get("projectId"));
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
  }

  try {
    await startLinkedInOAuth(projectId, userId!);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LinkedIn OAuth failed" },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "OAuth redirect failed" }, { status: 500 });
}
