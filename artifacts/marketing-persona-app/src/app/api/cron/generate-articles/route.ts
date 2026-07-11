import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  companiesTable,
  marketingPersonasTable,
  scheduledArticlesTable,
  wordpressConnectionsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { generateArticle } from "@/lib/ai/article-generator";
import { humanizeArticle, type HumanizationLevel } from "@/lib/ai/humanizer";
import { publishToWordPress } from "@/lib/publishers/wordpress";
import { decryptSecret } from "@workspace/security/encryption";
import { getAiClientForUser } from "@/lib/ai/gemini-client";
import { getMonthlyArticleCount, getPlanQuota, recordUsage } from "@/lib/usage";

function estimateCostUsd(totalTokens: number | undefined, wordCount: number): number {
  if (typeof totalTokens === "number" && totalTokens > 0) {
    return Number((totalTokens * 0.0000004).toFixed(4));
  }
  return Number((Math.max(wordCount, 800) * 0.00002).toFixed(4));
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.onboardingComplete, true));

  const results: { companyId: number; articleId?: number; error?: string; skipped?: string }[] = [];

  for (const company of companies) {
    try {
      const [owner] = await db
        .select({ plan: usersTable.plan, encryptedGeminiKey: usersTable.encryptedGeminiKey })
        .from(usersTable)
        .where(eq(usersTable.id, company.userId))
        .limit(1);

      const usesByok = Boolean(owner?.encryptedGeminiKey);
      if (!usesByok) {
        const quota = getPlanQuota(owner?.plan);
        if (quota !== null) {
          const articlesThisMonth = await getMonthlyArticleCount(company.id);
          if (articlesThisMonth >= quota) {
            console.log(
              `[cron/generate-articles] Skipping company ${company.id}: quota exhausted (${articlesThisMonth}/${quota} on ${owner?.plan ?? "starter"} plan, no BYOK key configured)`
            );
            results.push({ companyId: company.id, skipped: "quota_exhausted" });
            continue;
          }
        }
      }

      const [wp] = await db
        .select()
        .from(wordpressConnectionsTable)
        .where(and(eq(wordpressConnectionsTable.companyId, company.id), eq(wordpressConnectionsTable.isVerified, true)))
        .limit(1);

      const [persona] = await db
        .select()
        .from(marketingPersonasTable)
        .where(and(eq(marketingPersonasTable.companyId, company.id), eq(marketingPersonasTable.isActive, true)))
        .limit(1);

      const [articleRecord] = await db
        .insert(scheduledArticlesTable)
        .values({ companyId: company.id, personaId: persona?.id ?? null, status: "generating" })
        .returning();

      const aiConfig = await getAiClientForUser(company.userId);

      let generated = await generateArticle({
        company: {
          name: company.name,
          websiteUrl: company.websiteUrl,
          industry: company.industry,
          description: company.description,
          targetAudience: company.targetAudience,
        },
        persona: persona
          ? { name: persona.name, jobTitle: persona.jobTitle, painPoints: persona.painPoints, goals: persona.goals, preferredContent: persona.preferredContent }
          : null,
      }, {
        aiClient: aiConfig.client,
      });

      // Second pass: humanize the article unless the company opted out.
      let humanized = false;
      if (company.humanizationLevel !== "off") {
        const beforeHumanize = generated;
        generated = await humanizeArticle(generated, {
          level: company.humanizationLevel as HumanizationLevel,
          writingSample: company.writingSample ?? undefined,
          aiClient: aiConfig.client,
        });
        humanized = generated !== beforeHumanize;
      }

      const { source } = aiConfig;
      const estimatedCostUsd = estimateCostUsd(generated.generationUsage?.totalTokens, generated.wordCount);

      let status: string = "ready";
      let publishedUrl: string | undefined;
      let wordpressPostId: number | undefined;

      if (wp && wp.defaultStatus === "publish") {
        const appPassword = decryptSecret(wp.encryptedAppPassword);
        const result = await publishToWordPress(
          { siteUrl: wp.siteUrl, username: wp.username, appPassword },
          generated.title,
          generated.bodyMarkdown,
          "publish",
          generated.metaDescription,
          wp.defaultCategoryId ? [wp.defaultCategoryId] : undefined
        );
        status = "published";
        publishedUrl = result.url;
        wordpressPostId = result.postId;
      }

      // Append FAQ to body markdown (same as manual generate endpoint)
      let fullBody = generated.bodyMarkdown;
      if (generated.faqSection?.length > 0) {
        fullBody += "\n\n## Frequently Asked Questions\n\n";
        fullBody += generated.faqSection.map((f) => `**${f.question}**\n\n${f.answer}`).join("\n\n");
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
          status,
          humanized,
          publishedUrl: publishedUrl ?? null,
          wordpressPostId: wordpressPostId ?? null,
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
        .where(eq(scheduledArticlesTable.id, articleRecord.id))
        .returning();

      await recordUsage({
        userId: company.userId,
        companyId: company.id,
        eventType: "article_generation",
        promptTokens: generated.generationUsage?.promptTokens,
        outputTokens: generated.generationUsage?.outputTokens,
        totalTokens: generated.generationUsage?.totalTokens,
        usedByok: source === "user-key",
      });

      results.push({ companyId: company.id, articleId: updated.id });
    } catch (err) {
      results.push({ companyId: company.id, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
