import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { startBingWebmasterOAuth } from "@/lib/integrations/search-property-oauth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number(new URL(req.url).searchParams.get("projectId"));
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "projectId query param is required" }, { status: 400 });
  }

  try {
    return await startBingWebmasterOAuth(projectId, userId!);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bing Webmaster OAuth failed" },
      { status: 503 },
    );
  }
}
