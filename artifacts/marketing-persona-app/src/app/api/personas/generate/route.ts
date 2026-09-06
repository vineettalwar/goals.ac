import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { companiesTable, marketingPersonasTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { generatePersonas } from "@/lib/ai/persona-generator";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { z } from "zod";

const schema = z.object({ companyId: z.number() });

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(and(eq(companiesTable.id, parsed.data.companyId), eq(companiesTable.userId, userId!)))
    .limit(1);

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const [{ userApiKey, aiProviderOptions }, billingPrep] = await Promise.all([
    loadUserAiSettings(userId!),
    prepareAiBilling({
    userId: userId!,
    tier: "planning",
    quotaKind: "article",
    companyId: company.id,
  }),  ]);
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const generated = await generatePersonas(
      {
        companyName: company.name,
        websiteUrl: company.websiteUrl,
        industry: company.industry,
        description: company.description,
        targetAudience: company.targetAudience,
      },
      { userApiKey, aiProviderOptions },
    );

    const rows = await db
      .insert(marketingPersonasTable)
      .values(
        generated.map((p) => ({
          companyId: company.id,
          name: p.name,
          ageRange: p.ageRange,
          jobTitle: p.jobTitle,
          painPoints: p.painPoints,
          goals: p.goals,
          preferredContent: p.preferredContent,
        }))
      )
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      companyId: company.id,
      eventType: "persona_generation",
      usedByok: billingPrep.usedByok,
      tier: "planning",
    });

    return NextResponse.json({ personas: rows }, { status: 201 });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "generation_failed");
    return NextResponse.json({ error: "Failed to generate personas" }, { status: 500 });
  }
}
