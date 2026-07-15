import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { keywordOpportunitiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { buildBriefFromOpportunity } from "@workspace/content-engine/strategy/keyword-opportunity-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const oppId = Number(idStr);
  if (Number.isNaN(oppId)) {
    return NextResponse.json({ error: "Invalid opportunity id" }, { status: 400 });
  }

  const [opp] = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, oppId))
    .limit(1);

  if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  const access = await requireProjectAccess(opp.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const brief = await buildBriefFromOpportunity(oppId);
    return NextResponse.json({ brief });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Brief generation failed" },
      { status: 502 },
    );
  }
}
