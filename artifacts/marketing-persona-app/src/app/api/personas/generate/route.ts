import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { companiesTable, marketingPersonasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { generatePersonas } from "@/lib/ai/persona-generator";
import { loadUserAiSettings } from "@/lib/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
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
    .where(eq(companiesTable.id, parsed.data.companyId) && eq(companiesTable.userId, userId!))
    .limit(1);

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);

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

  return NextResponse.json({ personas: rows }, { status: 201 });
}
