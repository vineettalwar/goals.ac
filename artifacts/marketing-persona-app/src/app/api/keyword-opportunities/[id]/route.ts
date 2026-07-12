import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { keywordOpportunitiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";
import { queueOpportunityToStrategy } from "@workspace/content-engine/keyword-opportunity-service";
import { z } from "zod";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const oppId = Number(idStr);
  if (isNaN(oppId)) return NextResponse.json({ error: "Invalid opportunity id" }, { status: 400 });

  const [opp] = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, oppId))
    .limit(1);

  if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  const access = await requireProjectAccess(opp.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const result = await queueOpportunityToStrategy(oppId, userId!);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Queue failed" },
      { status: 502 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const oppId = Number(idStr);
  const parsed = z.object({ status: z.enum(["open", "queued", "dismissed"]) }).safeParse(await req.json().catch(() => null));

  if (isNaN(oppId) || !parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [opp] = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, oppId))
    .limit(1);

  if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  const access = await requireProjectAccess(opp.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [updated] = await db
    .update(keywordOpportunitiesTable)
    .set({ status: parsed.data.status })
    .where(eq(keywordOpportunitiesTable.id, oppId))
    .returning();

  return NextResponse.json(updated);
}
