import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { startBingWebmasterOAuth } from "@/lib/integrations/oauth/search-property-oauth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const projectId = Number(url.searchParams.get("projectId"));
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
  }

  try {
    return await startBingWebmasterOAuth(projectId, userId ?? 0, url.searchParams.get("returnUrl") ?? undefined);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bing Webmaster OAuth failed" },
      { status: 503 },
    );
  }
}
