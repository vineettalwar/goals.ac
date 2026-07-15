import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { keywordOpportunitiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import {
  queueOpportunityToStrategy,
  queueOpportunityAndGenerate,
} from "@workspace/content-engine/strategy/keyword-opportunity-service";

const PostBodySchema = z.object({
  generate: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const oppId = Number(idStr);
  if (isNaN(oppId)) return NextResponse.json({ error: "Invalid opportunity id" }, { status: 400 });

  const body = PostBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
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
    if (body.data.generate) {
      const result = await queueOpportunityAndGenerate(oppId, userId!);
      return NextResponse.json(result);
    }
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
