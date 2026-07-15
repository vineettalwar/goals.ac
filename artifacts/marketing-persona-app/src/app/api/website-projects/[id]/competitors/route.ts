import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/org/org-access";
import { loadCompetitorGenerationContext } from "@workspace/content-engine/support/competitor/competitor-generation-context";
import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [[brandProfile], context] = await Promise.all([
    db
      .select({ industry: brandProfilesTable.industry })
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1),
    loadCompetitorGenerationContext(projectId),
  ]);

  return NextResponse.json({
    competitorUrls: context.competitorUrls,
    industry: brandProfile?.industry ?? "",
    competitorPositioning: context.competitorPositioning ?? "",
    analyses: context.analyses.map((a) => ({
      competitorUrl: a.competitorUrl,
      competitorName: a.competitorName,
      contentGaps: a.contentGaps,
      quickWins: a.quickWins,
      threatLevel: a.threatLevel,
    })),
  });
}
