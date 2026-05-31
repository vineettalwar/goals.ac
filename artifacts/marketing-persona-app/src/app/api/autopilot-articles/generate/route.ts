import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { companiesTable, marketingPersonasTable, scheduledArticlesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { generateArticle } from "@/lib/ai/article-generator";
import { z } from "zod";

const schema = z.object({
  companyId: z.number(),
  personaId: z.number().optional(),
  keyword: z.string().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(and(eq(companiesTable.id, parsed.data.companyId), eq(companiesTable.userId, userId!)))
    .limit(1);

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  let persona = null;
  if (parsed.data.personaId) {
    const rows = await db
      .select()
      .from(marketingPersonasTable)
      .where(
        and(
          eq(marketingPersonasTable.id, parsed.data.personaId),
          eq(marketingPersonasTable.companyId, company.id)
        )
      )
      .limit(1);
    persona = rows[0] ?? null;
  } else {
    // Use the first active persona
    const rows = await db
      .select()
      .from(marketingPersonasTable)
      .where(and(eq(marketingPersonasTable.companyId, company.id), eq(marketingPersonasTable.isActive, true)))
      .limit(1);
    persona = rows[0] ?? null;
  }

  // Create a placeholder record immediately
  const [article] = await db
    .insert(scheduledArticlesTable)
    .values({
      companyId: company.id,
      personaId: persona?.id ?? null,
      status: "generating",
      primaryKeyword: parsed.data.keyword ?? null,
    })
    .returning();

  // Generate the article inline
  try {
    const generated = await generateArticle({
      company: {
        name: company.name,
        websiteUrl: company.websiteUrl,
        industry: company.industry,
        description: company.description,
        targetAudience: company.targetAudience,
      },
      persona: persona
        ? {
            name: persona.name,
            jobTitle: persona.jobTitle,
            painPoints: persona.painPoints,
            goals: persona.goals,
            preferredContent: persona.preferredContent,
          }
        : null,
      keyword: parsed.data.keyword,
    });

    const [updated] = await db
      .update(scheduledArticlesTable)
      .set({
        title: generated.title,
        bodyMarkdown: generated.bodyMarkdown,
        metaDescription: generated.metaDescription,
        primaryKeyword: generated.primaryKeyword,
        secondaryKeywords: generated.secondaryKeywords,
        wordCount: generated.wordCount,
        status: "ready",
      })
      .where(eq(scheduledArticlesTable.id, article.id))
      .returning();

    return NextResponse.json({ article: updated }, { status: 201 });
  } catch (err) {
    await db
      .update(scheduledArticlesTable)
      .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "Generation failed" })
      .where(eq(scheduledArticlesTable.id, article.id));

    return NextResponse.json({ error: "Article generation failed" }, { status: 500 });
  }
}
