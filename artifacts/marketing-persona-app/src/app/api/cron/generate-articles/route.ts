import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  companiesTable,
  marketingPersonasTable,
  scheduledArticlesTable,
  websiteProjectsTable,
  usersTable,
  organizationsTable,
  organizationMembersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { generateArticle } from "@/lib/ai/article-generator";
import { humanizeArticle } from "@/lib/ai/humanizer";
import { loadBrandContextForCompany } from "@workspace/content-engine/support/brand-context-loader";
import {
  resolveHumanizationLevel,
  resolveWritingSample,
} from "@workspace/content-engine/brand-voice";
import {
  decryptCmsCredentials,
  type CmsIntegrationCredentials,
} from "@workspace/content-engine/support/cms-integrations";
import { publishBlogPieceToPrimaryDestination } from "@workspace/content-engine/support/publish-destination";
import { resolveAiClientForUser } from "@workspace/content-engine/support/resolve-ai-client-for-user";
import { getMonthlyArticleCount, getPlanQuota, recordUsage } from "@/lib/usage";
import { getOrgMembership } from "@/lib/org-access";

function estimateCostUsd(totalTokens: number | undefined, wordCount: number): number {
  if (typeof totalTokens === "number" && totalTokens > 0) {
    return Number((totalTokens * 0.0000004).toFixed(4));
  }
  return Number((Math.max(wordCount, 800) * 0.00002).toFixed(4));
}

async function findProjectCmsForCompany(
  userId: number,
  websiteUrl: string,
): Promise<CmsIntegrationCredentials | null> {
  const membership = await getOrgMembership(userId);
  const projects = membership
    ? await db
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations, url: websiteProjectsTable.url })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.organizationId, membership.organizationId))
    : await db
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations, url: websiteProjectsTable.url })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.userId, userId));

  const normalizedCompanyUrl = websiteUrl.replace(/\/$/, "").toLowerCase();
  const matched =
    projects.find((p) => p.url.replace(/\/$/, "").toLowerCase() === normalizedCompanyUrl) ??
    projects.find((p) => p.cmsIntegrations && Object.keys(p.cmsIntegrations as object).length > 0);

  if (!matched?.cmsIntegrations) return null;
  return decryptCmsCredentials(matched.cmsIntegrations as CmsIntegrationCredentials);
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
        .select({
          plan: usersTable.plan,
          orgPlan: organizationsTable.plan,
          orgGeminiKey: organizationsTable.encryptedGeminiKey,
          userGeminiKey: usersTable.encryptedGeminiKey,
        })
        .from(usersTable)
        .leftJoin(organizationMembersTable, eq(organizationMembersTable.userId, usersTable.id))
        .leftJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
        .where(eq(usersTable.id, company.userId))
        .limit(1);

      const usesByok = Boolean(owner?.orgGeminiKey ?? owner?.userGeminiKey);
      if (!usesByok) {
        const quota = getPlanQuota(owner?.orgPlan ?? owner?.plan);
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

      const cmsCreds = await findProjectCmsForCompany(company.userId, company.websiteUrl);

      const [persona] = await db
        .select()
        .from(marketingPersonasTable)
        .where(and(eq(marketingPersonasTable.companyId, company.id), eq(marketingPersonasTable.isActive, true)))
        .limit(1);

      const [articleRecord] = await db
        .insert(scheduledArticlesTable)
        .values({ companyId: company.id, personaId: persona?.id ?? null, status: "generating" })
        .returning();

      const aiConfig = await resolveAiClientForUser(company.userId);
      const brandVoice = await loadBrandContextForCompany(company.userId, company);

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
        brandVoice,
      }, {
        aiClient: aiConfig.client,
      });

      let humanized = false;
      const humanizationLevel = resolveHumanizationLevel(brandVoice);
      if (humanizationLevel !== "off") {
        const beforeHumanize = generated;
        generated = await humanizeArticle(generated, {
          level: humanizationLevel,
          writingSample: resolveWritingSample(brandVoice),
          brandVoice,
          aiClient: aiConfig.client,
        });
        humanized = generated !== beforeHumanize;
      }

      const { source, providerId } = aiConfig;
      const estimatedCostUsd = estimateCostUsd(generated.generationUsage?.totalTokens, generated.wordCount);

      let status: string = "ready";
      let publishedUrl: string | undefined;
      let publishPlatform: string | undefined;

      if (cmsCreds) {
        try {
          const result = await publishBlogPieceToPrimaryDestination(
            {
              title: generated.title,
              bodyMarkdown: generated.bodyMarkdown,
              targetKeyword: generated.primaryKeyword,
              formatType: "blog_post",
            },
            cmsCreds,
            { status: "publish" },
          );
          status = "published";
          publishedUrl = result.publishedUrl;
          publishPlatform = result.publishPlatform;
        } catch (publishErr) {
          console.warn(
            `[cron/generate-articles] Publish failed for company ${company.id}:`,
            publishErr instanceof Error ? publishErr.message : publishErr,
          );
        }
      }

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
          wordpressPostId: null,
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
            publishPlatform: publishPlatform ?? null,
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
        provider: providerId,
        model: providerId === "gemini" ? "gemini-2.5-flash" : undefined,
        tier: "execution",
      });

      results.push({ companyId: company.id, articleId: updated.id });
    } catch (err) {
      results.push({ companyId: company.id, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
