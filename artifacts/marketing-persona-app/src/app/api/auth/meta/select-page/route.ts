import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { selectMetaPage } from "@/lib/integrations/oauth/social-oauth";

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;
  const pageId = body?.pageId as string | undefined;

  if (!token || !pageId) {
    return NextResponse.json({ error: "token and pageId are required" }, { status: 400 });
  }

  try {
    await selectMetaPage(token, pageId, userId!);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to select page" },
      { status: 500 },
    );
  }
}
