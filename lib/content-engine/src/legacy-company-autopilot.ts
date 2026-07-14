import { db } from "@workspace/db";
import {
  companiesTable,
  marketingPersonasTable,
  organizationMembersTable,
  scheduledArticlesTable,
  websiteProjectsTable,
  type Company,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import {
  cancelAiBillingSession,
  completeAiBillingSession,
  prepareAiBillingSession,
  type AiBillingContext,
} from "@workspace/billing";
import { generateArticle } from "./article-generator";
import { humanizeArticle } from "./humanizer";
import { resolveHumanizationLevel, resolveWritingSample } from "./brand-voice";
import {
  decryptCmsCredentials,
  type CmsIntegrationCredentials,
} from "./support/cms-integrations";
import { publishBlogPieceToPrimaryDestination } from "./support/publish-destination";
import { resolveAiClientForUser } from "./support/resolve-ai-client-for-user";
import { loadBrandContextForCompany } from "./support/brand-context-loader";

export interface LegacyCompanyAutopilotResult {
  companyId: number;
  articleId?: number;
  error?: string;
  skipped?: string;
}

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
  const [membership] = await db
    .select({ organizationId: organizationMembersTable.organizationId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);

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

export async function runLegacyCompanyAutopilot(
  company: Company,
): Promise<LegacyCompanyAutopilotResult> {
  let billingCtx: AiBillingContext | null = null;
  try {
    const aiConfig = await resolveAiClientForUser(company.userId);
    const usesByok = aiConfig.source === "user-key";

    const billingPrep = await prepareAiBillingSession({
      userId: company.userId,
      tier: "execution",
      usedByok: usesByok,
      quotaKind: usesByok ? undefined : "article",
      companyId: company.id,
    });

    if (!billingPrep.ok) {
      const reason =
        billingPrep.error.reason === "quota_exhausted"
          ? "quota_exhausted"
          : billingPrep.error.reason === "insufficient_credits"
            ? "insufficient_credits"
            : "billing_unavailable";
      return { companyId: company.id, skipped: reason };
    }
    billingCtx = billingPrep.ctx;

    const cmsCreds = await findProjectCmsForCompany(company.userId, company.websiteUrl);

    const [persona] = await db
      .select()
      .from(marketingPersonasTable)
      .where(
        and(
          eq(marketingPersonasTable.companyId, company.id),
          eq(marketingPersonasTable.isActive, true),
        ),
      )
      .limit(1);

    const [articleRecord] = await db
      .insert(scheduledArticlesTable)
      .values({ companyId: company.id, personaId: persona?.id ?? null, status: "generating" })
      .returning();

    const brandVoice = await loadBrandContextForCompany(company.userId, company);

    let generated = await generateArticle(
      {
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
        brandVoice,
      },
      { aiClient: aiConfig.client },
    );

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
    const estimatedCostUsd = estimateCostUsd(
      generated.generationUsage?.totalTokens,
      generated.wordCount,
    );

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
      } catch {
        /* publish failure is non-fatal — article stays ready */
      }
    }

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

    await completeAiBillingSession(billingCtx, {
      userId: company.userId,
      companyId: company.id,
      eventType: "article_generation",
      promptTokens: generated.generationUsage?.promptTokens,
      outputTokens: generated.generationUsage?.outputTokens,
      totalTokens: generated.generationUsage?.totalTokens,
      usedByok: usesByok,
      provider: providerId,
      model: providerId === "gemini" ? "gemini-2.5-flash" : undefined,
      tier: "execution",
    });

    return { companyId: company.id, articleId: updated.id };
  } catch (err) {
    if (billingCtx) {
      await cancelAiBillingSession(billingCtx, err instanceof Error ? err.message : "job_failed");
    }
    return {
      companyId: company.id,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function sweepLegacyCompanyAutopilot(): Promise<LegacyCompanyAutopilotResult[]> {
  const companies = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.onboardingComplete, true));

  const results: LegacyCompanyAutopilotResult[] = [];
  for (const company of companies) {
    results.push(await runLegacyCompanyAutopilot(company));
  }
  return results;
}
