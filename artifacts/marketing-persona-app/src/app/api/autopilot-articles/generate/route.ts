import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { companiesTable, marketingPersonasTable, scheduledArticlesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { generateArticle } from "@/lib/ai/article-generator";
import { humanizeArticle } from "@/lib/ai/humanizer";
import { loadBrandContextForCompany } from "@workspace/content-engine/support/brand-context-loader";
import {
  resolveHumanizationLevel,
  resolveWritingSample,
} from "@workspace/content-engine/brand-voice";
import { resolveAiClientForUser } from "@workspace/content-engine/support/resolve-ai-client-for-user";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { z } from "zod";

const schema = z.object({
  companyId: z.number(),
  personaId: z.number().optional(),
  keyword: z.string().optional(),
  angle: z.string().optional(),
  contentGoal: z.string().optional(),
  tonePreference: z.string().optional(),
});

function estimateCostUsd(totalTokens: number | undefined, wordCount: number): number {
  if (typeof totalTokens === "number" && totalTokens > 0) {
    // Approximate blended Gemini Flash token cost; shown as an estimate in UI.
    return Number((totalTokens * 0.0000004).toFixed(4));
  }
  return Number((Math.max(wordCount, 800) * 0.00002).toFixed(4));
}

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

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "execution",
    quotaKind: "article",
    companyId: company.id,
  });
  if (!billingPrep.ok) return billingPrep.response;

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
    const { client, source, providerId } = await resolveAiClientForUser(userId!);
    const brandVoice = await loadBrandContextForCompany(userId!, company);
    let generated = await generateArticle({
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
      angle: parsed.data.angle,
      contentGoal: parsed.data.contentGoal,
      tonePreference: parsed.data.tonePreference,
      brandVoice,
    }, { aiClient: client });

    // Second pass: humanize the article unless opted out.
    let humanized = false;
    const humanizationLevel = resolveHumanizationLevel(brandVoice);
    if (humanizationLevel !== "off") {
      const beforeHumanize = generated;
      generated = await humanizeArticle(generated, {
        level: humanizationLevel,
        writingSample: resolveWritingSample(brandVoice),
        brandVoice,
        aiClient: client,
      });
      humanized = generated !== beforeHumanize;
    }

    const estimatedCostUsd = estimateCostUsd(generated.generationUsage?.totalTokens, generated.wordCount);

    // Append FAQ to body markdown
    let fullBody = generated.bodyMarkdown;
    if (generated.faqSection?.length > 0) {
      fullBody += "\n\n## Frequently Asked Questions\n\n";
      fullBody += generated.faqSection
        .map((f) => `**${f.question}**\n\n${f.answer}`)
        .join("\n\n");
    }

    const [updated] = await db
      .update(scheduledArticlesTable)
      .set({
        title: generated.title,
        bodyMarkdown: fullBody,
        metaDescription: generated.metaDescription,
        primaryKeyword: generated.primaryKeyword,
        secondaryKeywords: generated.secondaryKeywords,
        wordCount: generated.wordCount,
        status: "ready",
        humanized,
        articleMetadata: {
          citations: generated.citations ?? [],
          faqSection: generated.faqSection ?? [],
          jsonLdSchema: generated.jsonLdSchema ?? null,
          personaAlignment: generated.personaAlignment ?? null,
          searchIntent: generated.searchIntent ?? null,
          readingTimeMinutes: generated.readingTimeMinutes ?? null,
          internalLinkSuggestions: generated.internalLinkSuggestions ?? [],
          generationSource: source,
          estimatedCostUsd,
          generationUsage: generated.generationUsage ?? null,
        },
      })
      .where(eq(scheduledArticlesTable.id, article.id))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      companyId: company.id,
      eventType: "article_generation",
      promptTokens: generated.generationUsage?.promptTokens,
      outputTokens: generated.generationUsage?.outputTokens,
      totalTokens: generated.generationUsage?.totalTokens,
      usedByok: billingPrep.usedByok,
      provider: providerId,
      model: providerId === "gemini" ? "gemini-2.5-flash" : undefined,
      tier: "execution",
    });

    return NextResponse.json({
      article: updated,
      generation: {
        source,
        providerId,
        estimatedCostUsd,
      },
    }, { status: 201 });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "generation_failed");
    await db
      .update(scheduledArticlesTable)
      .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "Generation failed" })
      .where(eq(scheduledArticlesTable.id, article.id));

    return NextResponse.json({ error: "Article generation failed" }, { status: 500 });
  }
}
