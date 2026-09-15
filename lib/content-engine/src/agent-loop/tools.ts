import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  brandProfilesTable,
  competitorAnalysesTable,
  contentPiecesTable,
  keywordOpportunitiesTable,
  searchPropertyConnectionsTable,
  trackedKeywordsTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { getGscQueryRowsForProject, getGscSyncStatus } from "../analytics/gsc-search-analytics-service";
import { defaultSyncDateRange } from "@workspace/seo-tools/analyticsDateRange";
import { assessPublishReadiness } from "../content/publish-readiness";
import { inspectPublishedUrl } from "../analytics/gsc-url-inspection-service";
import { wasRecentlyInspected } from "../analytics/gsc-url-inspection-rate-limit";
import { isBacklinksConfigured, fetchBacklinksOverview } from "@workspace/serp-provider";
import { syncActionQueueFromSignals } from "./action-queue";
import type { AgentTool, AgentToolResult, EvidenceRef } from "./types";

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

export function createFirstPartyTools(options?: {
  generateDraft?: (args: Record<string, unknown>) => Promise<AgentToolResult>;
}): AgentTool[] {
  const gscQuery: AgentTool = {
    name: "gsc_query",
    description: "Read stored Google Search Console query rows for the project.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const status = await getGscSyncStatus(projectId);
      if (!status.connected) {
        return empty("Search Console is not connected");
      }
      const range = defaultSyncDateRange(28);
      const rows = await getGscQueryRowsForProject(projectId, range.startDate, range.endDate);
      const keyword = typeof args.keyword === "string" ? args.keyword.trim().toLowerCase() : "";
      const filtered = keyword
        ? rows.filter((row) => row.query.toLowerCase().includes(keyword)).slice(0, 12)
        : rows.slice(0, 12);
      if (filtered.length === 0) {
        return empty("GSC connected but no query rows in the current window");
      }
      const refs: EvidenceRef[] = filtered.slice(0, 8).map((row) => ({
        source: `GSC "${row.query}" pos ${row.position.toFixed(1)}`,
        url: row.page ?? undefined,
        verified: true,
      }));
      return ok(`GSC: ${filtered.length} queries`, refs, { connected: true, rows: filtered, status });
    },
  };

  const siteContext: AgentTool = {
    name: "site_context",
    description: "Project + brand profile fields already stored in the database.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const [project] = await db
        .select({
          id: websiteProjectsTable.id,
          name: websiteProjectsTable.name,
          url: websiteProjectsTable.url,
        })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);
      if (!project) return fail("Project not found");
      const [brand] = await db
        .select({
          companyName: brandProfilesTable.companyName,
          industry: brandProfilesTable.industry,
          targetAudience: brandProfilesTable.targetAudience,
        })
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, projectId))
        .limit(1);
      return ok(`Site ${project.name}`, [{ source: project.url, url: project.url, verified: false }], {
        project,
        brand: brand ?? null,
      });
    },
  };

  const keywordContext: AgentTool = {
    name: "keyword_context",
    description: "Keyword opportunities + tracked keywords (same data MCP list_keyword_opportunities reads).",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const keyword = typeof args.keyword === "string" ? args.keyword.trim().toLowerCase() : "";
      const [opps, tracked] = await Promise.all([
        db
          .select({
            keyword: keywordOpportunitiesTable.keyword,
            source: keywordOpportunitiesTable.source,
            opportunityScore: keywordOpportunitiesTable.opportunityScore,
            suggestedAngle: keywordOpportunitiesTable.suggestedAngle,
          })
          .from(keywordOpportunitiesTable)
          .where(eq(keywordOpportunitiesTable.websiteProjectId, projectId))
          .orderBy(desc(keywordOpportunitiesTable.opportunityScore))
          .limit(40),
        db
          .select({
            keyword: trackedKeywordsTable.keyword,
            targetUrl: trackedKeywordsTable.targetUrl,
          })
          .from(trackedKeywordsTable)
          .where(eq(trackedKeywordsTable.websiteProjectId, projectId))
          .limit(40),
      ]);
      type OppRow = (typeof opps)[number];
      type TrackRow = (typeof tracked)[number];
      const oppHits: OppRow[] = keyword
        ? opps.filter((row: OppRow) => row.keyword.toLowerCase().includes(keyword))
        : opps.slice(0, 15);
      const trackHits: TrackRow[] = keyword
        ? tracked.filter((row: TrackRow) => row.keyword.toLowerCase().includes(keyword))
        : tracked.slice(0, 15);
      const refs: EvidenceRef[] = [
        ...oppHits.slice(0, 6).map((row: OppRow) => ({
          source: `keyword hub (${row.source}) ${row.keyword}`,
          verified: true as const,
        })),
        ...trackHits.slice(0, 4).map((row: TrackRow) => ({
          source: `tracked ${row.keyword}`,
          url: row.targetUrl ?? undefined,
          verified: true as const,
        })),
      ];
      if (refs.length === 0) return empty("No keyword hub or tracked-keyword rows");
      return ok(`Keywords: ${refs.length} hits`, refs, { opportunities: oppHits, tracked: trackHits });
    },
  };

  const competitorContext: AgentTool = {
    name: "competitor_context",
    description: "Stored competitor analyses for the project.",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const rows = await db
        .select({
          competitorUrl: competitorAnalysesTable.competitorUrl,
          result: competitorAnalysesTable.result,
        })
        .from(competitorAnalysesTable)
        .where(eq(competitorAnalysesTable.websiteProjectId, projectId))
        .orderBy(desc(competitorAnalysesTable.createdAt))
        .limit(5);
      if (rows.length === 0) return empty("No competitor analyses on file");
      const refs: EvidenceRef[] = rows.map((row: (typeof rows)[number]) => ({
        source: row.competitorUrl,
        url: row.competitorUrl,
        verified: true,
      }));
      return ok(`Competitors: ${rows.length}`, refs, { analyses: rows });
    },
  };

  const publishReadiness: AgentTool = {
    name: "publish_readiness",
    description: "Deterministic publish readiness (same gate as MCP get_publish_readiness).",
    risk: "read",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const contentPieceId = Number(args.contentPieceId);
      const [piece] = await db
        .select()
        .from(contentPiecesTable)
        .where(
          and(eq(contentPiecesTable.id, contentPieceId), eq(contentPiecesTable.websiteProjectId, projectId)),
        )
        .limit(1);
      if (!piece) return fail("Content piece not found");
      const readiness = assessPublishReadiness({
        title: piece.title,
        bodyMarkdown: piece.bodyMarkdown ?? "",
        pieceMetadata: piece.pieceMetadata,
      });
      return ok(readiness.ok ? "Ready to publish" : `Blocked: ${readiness.blockers[0]?.code ?? "gate"}`, [], {
        readiness,
      });
    },
  };

  const inspectUrl: AgentTool = {
    name: "inspect_url",
    description: "GSC URL Inspection (same service as MCP inspect_url).",
    risk: "write",
    creditCost: 2,
    async execute(args) {
      const projectId = Number(args.projectId);
      const inspectionUrl = String(args.inspectionUrl ?? "");
      if (!inspectionUrl) return fail("inspectionUrl required");
      const gsc = await getGscSyncStatus(projectId);
      if (!gsc.connected) return empty("Search Console is not connected");
      if (await wasRecentlyInspected(projectId, inspectionUrl)) {
        return empty("URL inspected within the last 60 minutes");
      }
      try {
        const inspection = await inspectPublishedUrl({
          projectId,
          inspectionUrl,
          contentPieceId: args.contentPieceId != null ? Number(args.contentPieceId) : undefined,
        });
        return ok(`Inspection ${inspection.verdict ?? inspection.coverageState ?? "ok"}`, [
          { source: "GSC URL Inspection", url: inspectionUrl, verified: true },
        ], { inspection });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "inspect_url failed");
      }
    },
  };

  const backlinks: AgentTool = {
    name: "get_backlinks_overview",
    description: "DataForSEO backlinks overview (same as MCP get_backlinks_overview).",
    risk: "read",
    creditCost: 2,
    async execute(args) {
      if (!isBacklinksConfigured()) return empty("DataForSEO is not configured");
      const projectId = Number(args.projectId);
      const [project] = await db
        .select({ url: websiteProjectsTable.url })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);
      if (!project?.url) return fail("Project URL missing");
      try {
        const overview = await fetchBacklinksOverview({
          target: project.url,
          referringDomainsLimit: 10,
        });
        return ok("Backlinks overview fetched", [{ source: "DataForSEO backlinks", url: project.url, verified: true }], {
          overview,
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "backlinks failed");
      }
    },
  };

  const upsertQueue: AgentTool = {
    name: "upsert_action_queue",
    description: "Score GSC + decay signals into the action queue.",
    risk: "write",
    creditCost: 1,
    async execute(args) {
      const projectId = Number(args.projectId);
      const result = await syncActionQueueFromSignals(projectId);
      const refs: EvidenceRef[] = result.items.slice(0, 8).map((item) => ({
        source: `${item.actionType}:${item.keyword}`,
        url: item.url ?? undefined,
        verified: item.evidence.length > 0,
      }));
      return ok(`Action queue upserted ${result.upserted} items`, refs, result);
    },
  };

  const generateDraft: AgentTool = {
    name: "generate_draft",
    description: "Queue or run one draft. Injected in the worker; tests stub this.",
    risk: "write",
    creditCost: 5,
    async execute(args, ctx) {
      if (options?.generateDraft) return options.generateDraft(args);
      return ok("Draft generation deferred to worker injector", [], {
        queued: false,
        stub: true,
        keyword: args.keyword ?? ctx.goal.keyword,
      });
    },
  };

  const publishLive: AgentTool = {
    name: "publish_live",
    description: "Live CMS publish. Default policy gates this for approval.",
    risk: "publish_live",
    creditCost: 3,
    async execute() {
      return fail("publish_live must not run without an explicit allowLivePublish policy");
    },
  };

  return [
    siteContext,
    gscQuery,
    keywordContext,
    competitorContext,
    inspectUrl,
    backlinks,
    publishReadiness,
    upsertQueue,
    generateDraft,
    publishLive,
  ];
}
