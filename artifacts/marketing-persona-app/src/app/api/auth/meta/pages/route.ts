import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getMetaPagesSession } from "@/lib/integrations/oauth/social-oauth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token query param required" }, { status: 400 });
  }

  const data = await getMetaPagesSession(token, userId!);
  if (!data) {
    return NextResponse.json({ error: "Page selection session expired" }, { status: 404 });
  }

  return NextResponse.json({
    projectId: data.projectId,
    pages: data.pages.map((p) => ({
      pageId: p.pageId,
      pageName: p.pageName,
      instagramAccountId: p.instagramAccountId,
      instagramUsername: p.instagramUsername,
    })),
  });
}
