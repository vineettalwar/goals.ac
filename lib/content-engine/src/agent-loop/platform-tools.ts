import { and, desc, eq, inArray } from "drizzle-orm";
import { db, generateRoadmapSlug } from "@workspace/db";
import {
  brandProfilesTable,
  contentItemsTable,
  contentPiecesTable,
  contentStrategiesTable,
  geoAuditsTable,
  goalsTable,
  llmVisibilitySnapshotsTable,
  roadmapsTable,
  websiteProjectsTable,
  type ContentFormatType,
} from "@workspace/db/schema";
import { defaultSyncDateRange } from "@workspace/seo-tools/analyticsDateRange";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { enqueue } from "@workspace/jobs/boss";
import { QUEUES } from "@workspace/jobs/queues";
import { getArticlePerformance } from "../analytics/article-performance";
import { generateRoadmap } from "../strategy/roadmap-generator";
import { generateTopicalMap } from "../strategy/topical-map-generator";
import { parseAutopilotSettings } from "../support/autopilot/autopilot-scheduler";
import { getDecryptedUserGeminiKey } from "../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import { loadBrandContextForProject } from "../support/brand/brand-context-loader";
import { generateContentPiece } from "../content/content-studio-generator";
import type { AgentTool, AgentToolResult, EvidenceRef } from "./types";

const SOCIAL_FORMATS: ContentFormatType[] = [
  "linkedin_post",
  "twitter_thread",
  "instagram_post",
  "facebook_post",
  "bluesky_post",
  "mastodon_post",
];

function ok(summary: string, evidenceRefs: EvidenceRef[], data?: unknown): AgentToolResult {
  const verified = evidenceRefs.some((ref) => ref.verified);
  return { ok: true, summary, evidenceRefs, data, hasToolEvidence: verified };
}

function empty(summary: string): AgentToolResult {
  return { ok: true, summary, evidenceRefs: [], hasToolEvidence: false };
}

function fail(error: string): AgentToolResult {
  return { ok: false, summary: error, error, evidenceRefs: [], hasToolEvidence: false };
}

function socialFormatFromText(text?: string): ContentFormatType {
  const lower = (text ?? "").toLowerCase();
  if (/\btwitter|x\.com|\bthread\b/.test(lower)) return "twitter_thread";
  if (/\binstagram\b/.test(lower)) return "instagram_post";
  if (/\bfacebook\b/.test(lower)) return "facebook_post";
  if (/\bbluesky\b/.test(lower)) return "bluesky_post";
  if (/\bmastodon\b/.test(lower)) return "mastodon_post";
  return "linkedin_post";
}

export function createPlatformTools(): AgentTool[] {
  const strategyOverview: AgentTool = {
    name: "strategy_overview",
    description: "Read stored content strategies and goals for the project.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const [strategies, goals] = await Promise.all([
        db
          .select({
            id: contentStrategiesTable.id,
            industry: contentStrategiesTable.industry,
            month: contentStrategiesTable.month,
            year: contentStrategiesTable.year,
          })
          .from(contentStrategiesTable)
          .where(eq(contentStrategiesTable.websiteProjectId, projectId))
          .orderBy(desc(contentStrategiesTable.createdAt))
          .limit(5),
        db
          .select({
            id: goalsTable.id,
            objective: goalsTable.objective,
            status: goalsTable.status,
            targetMetric: goalsTable.targetMetric,
          })
          .from(goalsTable)
          .where(eq(goalsTable.projectId, projectId))
          .limit(8),
      ]);
      if (strategies.length === 0 && goals.length === 0) {
        return empty("No strategy or goals on file");
      }
      const refs: EvidenceRef[] = [
        ...strategies.slice(0, 3).map((row) => ({
          source: `strategy ${row.year}-${row.month} ${row.industry}`,
          verified: true as const,
        })),
        ...goals.slice(0, 3).map((row) => ({
          source: `goal ${row.objective} (${row.status})`,
          verified: true as const,
        })),
      ];
      return ok(`Strategy: ${strategies.length} plans, ${goals.length} goals`, refs, { strategies, goals });
    },
  };

  const calendarOverview: AgentTool = {
    name: "calendar_overview",
    description: "Read upcoming content calendar items for the project.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const strategies = await db
        .select({ id: contentStrategiesTable.id })
        .from(contentStrategiesTable)
        .where(eq(contentStrategiesTable.websiteProjectId, projectId))
        .limit(8);
      if (strategies.length === 0) return empty("No content calendar on file");
      const items = await db
        .select({
          title: contentItemsTable.title,
          format: contentItemsTable.format,
          primaryKeyword: contentItemsTable.primaryKeyword,
          status: contentItemsTable.status,
          day: contentItemsTable.day,
        })
        .from(contentItemsTable)
        .where(
          inArray(
            contentItemsTable.strategyId,
            strategies.map((row) => row.id),
          ),
        )
        .limit(12);
      if (items.length === 0) return empty("Calendar exists but has no items");
      return ok(`Calendar: ${items.length} items`, items.slice(0, 6).map((row) => ({
        source: `${row.format}: ${row.primaryKeyword}`,
        verified: true,
      })), { items });
    },
  };

  const performanceOverview: AgentTool = {
    name: "performance_overview",
    description: "Read stored GA4 + GSC article performance for the project.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const range = defaultSyncDateRange(28);
      const result = await getArticlePerformance(projectId, range.startDate, range.endDate);
      const connected = result.connectionStatus.ga4.connected || result.connectionStatus.gsc.connected;
      if (!connected) return empty("GA4 and Search Console are not connected");
      if (result.articles.length === 0) return empty("Performance connected but no article rows");
      const refs: EvidenceRef[] = result.articles.slice(0, 6).map((row) => ({
        source: `${row.title} clicks ${row.gsc.clicks}`,
        url: row.publishedUrl ?? undefined,
        verified: true,
      }));
      return ok(`Performance: ${result.articles.length} articles`, refs, {
        totals: result.totals,
        articles: result.articles.slice(0, 8),
      });
    },
  };

  const visibilityOverview: AgentTool = {
    name: "visibility_overview",
    description: "Read stored AI visibility snapshots for the project.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const rows = await db
        .select({
          prompt: llmVisibilitySnapshotsTable.prompt,
          engine: llmVisibilitySnapshotsTable.engine,
          cited: llmVisibilitySnapshotsTable.cited,
          checkedAt: llmVisibilitySnapshotsTable.checkedAt,
        })
        .from(llmVisibilitySnapshotsTable)
        .where(eq(llmVisibilitySnapshotsTable.websiteProjectId, projectId))
        .orderBy(desc(llmVisibilitySnapshotsTable.checkedAt))
        .limit(12);
      if (rows.length === 0) return empty("No AI visibility snapshots on file");
      const cited = rows.filter((row) => row.cited).length;
      return ok(`Visibility: ${cited}/${rows.length} cited`, rows.slice(0, 6).map((row) => ({
        source: `${row.engine} ${row.cited ? "cited" : "miss"}`,
        verified: true,
      })), { rows });
    },
  };

  const geoLastAudit: AgentTool = {
    name: "geo_last_audit",
    description: "Read the latest GEO audit stored for the project.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const [row] = await db
        .select({
          id: geoAuditsTable.id,
          url: geoAuditsTable.url,
          geoScore: geoAuditsTable.geoScore,
          createdAt: geoAuditsTable.createdAt,
        })
        .from(geoAuditsTable)
        .where(eq(geoAuditsTable.websiteProjectId, projectId))
        .orderBy(desc(geoAuditsTable.createdAt))
        .limit(1);
      if (!row) return empty("No GEO audit on file");
      return ok(`GEO score ${row.geoScore} for ${row.url}`, [{ source: `GEO ${row.geoScore}`, url: row.url, verified: true }], {
        audit: row,
      });
    },
  };

  const socialQueueStatus: AgentTool = {
    name: "social_queue_status",
    description: "Count draft/generating social pieces for the project. Does not post live.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const rows = await db
        .select({
          id: contentPiecesTable.id,
          title: contentPiecesTable.title,
          formatType: contentPiecesTable.formatType,
          status: contentPiecesTable.status,
        })
        .from(contentPiecesTable)
        .where(
          and(eq(contentPiecesTable.websiteProjectId, projectId), inArray(contentPiecesTable.formatType, SOCIAL_FORMATS)),
        )
        .orderBy(desc(contentPiecesTable.updatedAt))
        .limit(12);
      if (rows.length === 0) return empty("No social drafts on file");
      return ok(`Social: ${rows.length} pieces`, rows.slice(0, 6).map((row) => ({
        source: `${row.formatType} ${row.status}`,
        verified: true,
      })), { rows });
    },
  };

  const autopilotStatus: AgentTool = {
    name: "autopilot_status",
    description: "Read Autopilot flags for the project. Does not enable unattended spend.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const [project] = await db
        .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);
      if (!project) return fail("Project not found");
      const settings = parseAutopilotSettings(project.autopilotSettings);
      return ok(
        `Autopilot ${settings.enabled ? "on" : "off"} · ${settings.cadence} · publish ${settings.publishMode}`,
        [{ source: `autopilot enabled=${settings.enabled}`, verified: true }],
        { settings },
      );
    },
  };

  const integrationsHealth: AgentTool = {
    name: "integrations_health",
    description: "List stored CMS/social connection keys on the project. Does not run live OAuth.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const [project] = await db
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);
      if (!project) return fail("Project not found");
      const raw = project.cmsIntegrations;
      const keys =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? Object.keys(raw as Record<string, unknown>).filter((key) => Boolean((raw as Record<string, unknown>)[key]))
          : [];
      if (keys.length === 0) return empty("No CMS or social credentials stored");
      return ok(`Connections on file: ${keys.join(", ")}`, keys.slice(0, 8).map((key) => ({
        source: `integration ${key}`,
        verified: true,
      })), { keys });
    },
  };

  const generateRoadmapTool: AgentTool = {
    name: "generate_roadmap",
    description: "Generate one 12-month roadmap from the brand profile and store it.",
    risk: "write",
    creditCost: 5,
    async execute(args, ctx) {
      const projectId = Number(args.projectId);
      const [brand] = await db
        .select({
          industry: brandProfilesTable.industry,
          companyName: brandProfilesTable.companyName,
        })
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, projectId))
        .limit(1);
      const industry = brand?.industry?.trim();
      if (!industry) return fail("Brand industry missing — set it on the project first");
      const location = "global";
      const stage = "growth";
      const slug = generateRoadmapSlug(industry, location, stage);
      const [existing] = await db.select({ id: roadmapsTable.id, slug: roadmapsTable.slug }).from(roadmapsTable).where(eq(roadmapsTable.slug, slug)).limit(1);
      if (existing) {
        return ok(`Roadmap already stored (${existing.slug})`, [{ source: `roadmap ${existing.slug}`, verified: true }], {
          roadmapId: existing.id,
        });
      }
      const userApiKey = ctx.userId ? await getDecryptedUserGeminiKey(ctx.userId) : null;
      const aiProviderOptions = ctx.userId ? await getUserAiProviderOptions(ctx.userId) : undefined;
      try {
        const content = await generateRoadmap(industry, location, stage, userApiKey, aiProviderOptions);
        const [row] = await db
          .insert(roadmapsTable)
          .values({ slug, industry, location, stage, content })
          .returning({ id: roadmapsTable.id, slug: roadmapsTable.slug });
        return ok(`Stored roadmap ${row?.slug ?? slug}`, [{ source: `roadmap ${slug}`, verified: false }], {
          roadmapId: row?.id,
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Roadmap generation failed");
      }
    },
  };

  const generateTopicalMapTool: AgentTool = {
    name: "generate_topical_map",
    description: "Generate a topical map from brand + existing article titles.",
    risk: "write",
    creditCost: 5,
    async execute(args, ctx) {
      const projectId = Number(args.projectId);
      const brand = await loadBrandContextForProject(projectId);
      if (!brand) return fail("Brand profile missing");
      const titles = await db
        .select({ title: contentPiecesTable.title })
        .from(contentPiecesTable)
        .where(eq(contentPiecesTable.websiteProjectId, projectId))
        .limit(40);
      const userApiKey = ctx.userId ? await getDecryptedUserGeminiKey(ctx.userId) : null;
      const aiProviderOptions = ctx.userId ? await getUserAiProviderOptions(ctx.userId) : undefined;
      try {
        const map = await generateTopicalMap(
          {
            company: {
              name: brand.companyName,
              industry: brand.industry,
              description: brand.companyName,
              targetAudience: brand.targetAudience,
              websiteUrl: brand.websiteUrl,
            },
            existingArticleTitles: titles.map((row) => row.title),
            primaryKeywords: brand.primaryKeywords,
          },
          { userApiKey, aiProviderOptions },
        );
        return ok(
          `Topical map: authority ${map.topicalAuthority}, next ${map.recommendedNextArticle}`,
          [{ source: `topical authority ${map.topicalAuthority}`, verified: false }],
          { map },
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Topical map failed");
      }
    },
  };

  const runGeoAudit: AgentTool = {
    name: "run_geo_audit",
    description: "Fetch a URL and store a GEO audit for the project.",
    risk: "write",
    creditCost: 3,
    async execute(args) {
      const projectId = Number(args.projectId);
      const [project] = await db
        .select({ url: websiteProjectsTable.url })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);
      const url = typeof args.url === "string" && args.url.startsWith("http") ? args.url : project?.url;
      if (!url) return fail("URL required for GEO audit");
      try {
        const auditResult = await auditUrl(url);
        const [audit] = await db
          .insert(geoAuditsTable)
          .values({
            url: auditResult.url,
            websiteProjectId: projectId,
            geoScore: auditResult.geoScore,
            issues: auditResult.issues,
            pageTitle: auditResult.pageTitle,
            metaDescription: auditResult.metaDescription,
            hasSchemaOrg: auditResult.hasSchemaOrg,
            schemaTypes: auditResult.schemaTypes,
            h1Count: auditResult.h1Count,
            imageCount: auditResult.imageCount,
            imagesMissingAlt: auditResult.imagesMissingAlt,
          })
          .returning({ id: geoAuditsTable.id, geoScore: geoAuditsTable.geoScore });
        return ok(`GEO audit stored, score ${audit?.geoScore ?? auditResult.geoScore}`, [
          { source: `GEO ${auditResult.geoScore}`, url: auditResult.url, verified: true },
        ], { auditId: audit?.id });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "GEO audit failed");
      }
    },
  };

  const runVisibilityCheck: AgentTool = {
    name: "run_visibility_check",
    description: "Queue an AI visibility check job for the project.",
    risk: "write",
    creditCost: 2,
    async execute(args) {
      const projectId = Number(args.projectId);
      try {
        const jobId = await enqueue(QUEUES.llmVisibilityCheck, { projectId });
        return ok("Queued AI visibility check", [{ source: "llm-visibility-check", verified: false }], {
          queued: true,
          jobId,
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Visibility enqueue failed");
      }
    },
  };

  const startDailyFive: AgentTool = {
    name: "start_daily_five",
    description: "Create 1–5 draft pieces and queue generation. Needs keywords in the message.",
    risk: "write",
    creditCost: 5,
    async execute(args, ctx) {
      const projectId = Number(args.projectId);
      const userId = ctx.userId;
      if (!userId) return fail("userId required for Daily Five");
      const raw = typeof args.keyword === "string" ? args.keyword : "";
      const keywords = raw
        .split(/[,;]+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .slice(0, 5);
      if (keywords.length === 0) {
        return empty("Daily Five needs 1–5 keywords in the message");
      }
      const created: number[] = [];
      for (const keyword of keywords) {
        const [piece] = await db
          .insert(contentPiecesTable)
          .values({
            websiteProjectId: projectId,
            title: keyword,
            targetKeyword: keyword,
            formatType: "blog_post",
            status: "generating",
            bodyMarkdown: "",
            wordCount: 0,
          })
          .returning({ id: contentPiecesTable.id });
        if (!piece) continue;
        await enqueue(QUEUES.contentGenerate, {
          contentPieceId: piece.id,
          projectId,
          userId,
          generateVariants: false,
        });
        created.push(piece.id);
      }
      if (created.length === 0) return fail("Could not create Daily Five drafts");
      return ok(`Queued Daily Five for ${created.length} keyword(s)`, [], {
        contentPieceId: created[0],
        contentPieceIds: created,
      });
    },
  };

  const draftSocial: AgentTool = {
    name: "draft_social",
    description: "Draft one social post into Studio. Does not publish live.",
    risk: "write",
    creditCost: 5,
    async execute(args, ctx) {
      const projectId = Number(args.projectId);
      const keyword = typeof args.keyword === "string" ? args.keyword.trim() : "";
      if (!keyword) return fail("keyword required for a social draft");
      const brand = await loadBrandContextForProject(projectId);
      if (!brand) return fail("Brand profile missing");
      const format = socialFormatFromText(`${ctx.goal.text} ${keyword}`);
      const userApiKey = ctx.userId ? await getDecryptedUserGeminiKey(ctx.userId) : null;
      const aiProviderOptions = ctx.userId ? await getUserAiProviderOptions(ctx.userId) : undefined;
      try {
        const generated = await generateContentPiece(
          format,
          brand,
          keyword,
          undefined,
          false,
          userApiKey,
          aiProviderOptions,
        );
        const [piece] = await db
          .insert(contentPiecesTable)
          .values({
            websiteProjectId: projectId,
            formatType: format,
            title: generated.title || keyword,
            targetKeyword: keyword,
            bodyMarkdown: generated.body_markdown,
            status: "draft",
            wordCount: generated.body_markdown.split(/\s+/).filter(Boolean).length,
            pieceMetadata: generated.pieceMetadata ?? null,
          })
          .returning({ id: contentPiecesTable.id });
        return ok(`Social draft ${piece?.id ?? "?"} (${format})`, [], { contentPieceId: piece?.id, format });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Social draft failed");
      }
    },
  };

  const brandRescan: AgentTool = {
    name: "brand_rescan",
    description: "Queue a brand scrape for the project site.",
    risk: "write",
    creditCost: 2,
    async execute(args) {
      const projectId = Number(args.projectId);
      try {
        const jobId = await enqueue(QUEUES.brandScrape, { projectId });
        return ok("Queued brand rescan", [{ source: "brand-scrape", verified: false }], { queued: true, jobId });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Brand scrape enqueue failed");
      }
    },
  };

  return [
    strategyOverview,
    calendarOverview,
    performanceOverview,
    visibilityOverview,
    geoLastAudit,
    socialQueueStatus,
    autopilotStatus,
    integrationsHealth,
    generateRoadmapTool,
    generateTopicalMapTool,
    runGeoAudit,
    runVisibilityCheck,
    startDailyFive,
    draftSocial,
    brandRescan,
  ];
}
