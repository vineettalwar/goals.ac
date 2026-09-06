import { and, desc, eq } from "drizzle-orm";
import {
  db,
  websiteProjectsTable,
  brandProfilesTable,
  siteAuditsTable,
  siteAuditIssuesTable,
  keywordOpportunitiesTable,
  contentPiecesTable,
} from "@workspace/db";
import { inspectPublishedUrl } from "@workspace/content-engine/analytics/gsc-url-inspection-service";
import { wasRecentlyInspected } from "@workspace/content-engine/analytics/gsc-url-inspection-rate-limit";
import {
  assertProjectInOrg,
  requireApiKeyScope,
  resolveOrgBillingUserId,
} from "@workspace/content-engine/support/auth/api-key-auth";
import { assessPublishReadiness } from "@workspace/content-engine/content/publish-readiness";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import {
  fetchBacklinksOverview,
  isBacklinksConfigured,
} from "@workspace/serp-provider";
import {
  enqueue,
  QUEUES,
  JobsUnavailableError,
  processSiteAuditCrawl,
} from "@workspace/jobs";
import { McpToolError, type McpToolContext, type McpToolResult } from "./types";

function okJson(data: unknown): McpToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errResult(err: unknown): McpToolResult {
  const message = err instanceof Error ? err.message : "Tool failed";
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function normalizeHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new McpToolError("URL is required", "invalid_params");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function listProjects(ctx: McpToolContext): Promise<McpToolResult> {
  try {
    requireApiKeyScope(ctx.key, "content:read");
    const projects = await db
      .select({
        id: websiteProjectsTable.id,
        name: websiteProjectsTable.name,
        url: websiteProjectsTable.url,
        organizationId: websiteProjectsTable.organizationId,
        crawlStatus: websiteProjectsTable.crawlStatus,
        createdAt: websiteProjectsTable.createdAt,
      })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.organizationId, ctx.key.organizationId))
      .orderBy(desc(websiteProjectsTable.createdAt));
    return okJson({ projects });
  } catch (err) {
    return errResult(err);
  }
}

export async function getProject(
  ctx: McpToolContext,
  args: { projectId: number },
): Promise<McpToolResult> {
  try {
    requireApiKeyScope(ctx.key, "content:read");
    await assertProjectInOrg(args.projectId, ctx.key.organizationId);
    const [project] = await db
      .select({
        id: websiteProjectsTable.id,
        name: websiteProjectsTable.name,
        url: websiteProjectsTable.url,
        organizationId: websiteProjectsTable.organizationId,
        sitemapUrl: websiteProjectsTable.sitemapUrl,
        crawlStatus: websiteProjectsTable.crawlStatus,
        scrapeStatus: websiteProjectsTable.scrapeStatus,
        contentStyle: websiteProjectsTable.contentStyle,
        createdAt: websiteProjectsTable.createdAt,
        updatedAt: websiteProjectsTable.updatedAt,
      })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, args.projectId))
      .limit(1);
    if (!project) throw new McpToolError("Project not found", "not_found");
    return okJson({ project });
  } catch (err) {
    return errResult(err);
  }
}

export async function runSiteAudit(
  ctx: McpToolContext,
  args: { projectId: number; startUrl?: string; maxPages?: number; sync?: boolean },
): Promise<McpToolResult> {
  try {
    // Crawl is a write + open-world fetch; reuse content:generate (no new scope).
    requireApiKeyScope(ctx.key, "content:generate");
    await assertProjectInOrg(args.projectId, ctx.key.organizationId);

    const [project] = await db
      .select({ url: websiteProjectsTable.url })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, args.projectId))
      .limit(1);
    if (!project) throw new McpToolError("Project not found", "not_found");

    const startUrl = normalizeHttpUrl(args.startUrl ?? project.url);
    await assertPublicUrl(startUrl);

    const maxPages = Math.min(Math.max(args.maxPages ?? 50, 1), 100);
    const [audit] = await db
      .insert(siteAuditsTable)
      .values({
        websiteProjectId: args.projectId,
        startUrl,
        status: "pending",
        maxPages,
      })
      .returning();
    if (!audit) throw new McpToolError("Failed to create audit", "failed");

    const runSync = async () => {
      await processSiteAuditCrawl({ siteAuditId: audit.id });
      const [fresh] = await db
        .select()
        .from(siteAuditsTable)
        .where(eq(siteAuditsTable.id, audit.id))
        .limit(1);
      return fresh ?? audit;
    };

    if (args.sync) {
      return okJson({ audit: await runSync(), mode: "sync" });
    }

    try {
      await enqueue(QUEUES.siteAuditCrawl, { siteAuditId: audit.id });
      return okJson({ audit: { ...audit, queued: true }, mode: "queued" });
    } catch (err) {
      if (err instanceof JobsUnavailableError) {
        return okJson({ audit: await runSync(), mode: "sync_fallback" });
      }
      throw err;
    }
  } catch (err) {
    return errResult(err);
  }
}

export async function getAuditIssues(
  ctx: McpToolContext,
  args: { projectId: number; auditId: number; severity?: string },
): Promise<McpToolResult> {
  try {
    requireApiKeyScope(ctx.key, "content:read");
    await assertProjectInOrg(args.projectId, ctx.key.organizationId);

    const [audit] = await db
      .select()
      .from(siteAuditsTable)
      .where(
        and(
          eq(siteAuditsTable.id, args.auditId),
          eq(siteAuditsTable.websiteProjectId, args.projectId),
        ),
      )
      .limit(1);
    if (!audit) throw new McpToolError("Audit not found", "not_found");

    const issues = await db
      .select()
      .from(siteAuditIssuesTable)
      .where(eq(siteAuditIssuesTable.siteAuditId, args.auditId));

    const filtered = args.severity
      ? issues.filter((i) => i.severity === args.severity)
      : issues;

    return okJson({
      audit: {
        id: audit.id,
        status: audit.status,
        startUrl: audit.startUrl,
        pagesCrawled: audit.pagesCrawled,
        crawlComplete: audit.crawlComplete,
        errorMessage: audit.errorMessage,
      },
      issueCount: filtered.length,
      bySeverity: {
        critical: filtered.filter((i) => i.severity === "critical").length,
        warning: filtered.filter((i) => i.severity === "warning").length,
        info: filtered.filter((i) => i.severity === "info").length,
      },
      issues: filtered.slice(0, 100),
    });
  } catch (err) {
    return errResult(err);
  }
}

export async function listKeywordOpportunities(
  ctx: McpToolContext,
  args: { projectId: number; status?: string; limit?: number },
): Promise<McpToolResult> {
  try {
    requireApiKeyScope(ctx.key, "content:read");
    await assertProjectInOrg(args.projectId, ctx.key.organizationId);

    const status = (args.status ?? "open") as "open" | "queued" | "dismissed";
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 100);

    const opportunities = await db
      .select({
        id: keywordOpportunitiesTable.id,
        keyword: keywordOpportunitiesTable.keyword,
        source: keywordOpportunitiesTable.source,
        opportunityScore: keywordOpportunitiesTable.opportunityScore,
        difficulty: keywordOpportunitiesTable.difficulty,
        estimatedVolume: keywordOpportunitiesTable.estimatedVolume,
        intent: keywordOpportunitiesTable.intent,
        suggestedTitle: keywordOpportunitiesTable.suggestedTitle,
        suggestedAngle: keywordOpportunitiesTable.suggestedAngle,
        status: keywordOpportunitiesTable.status,
        createdAt: keywordOpportunitiesTable.createdAt,
      })
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, args.projectId),
          eq(keywordOpportunitiesTable.status, status),
        ),
      )
      .orderBy(desc(keywordOpportunitiesTable.opportunityScore))
      .limit(limit);

    return okJson({ opportunities, status });
  } catch (err) {
    return errResult(err);
  }
}

export async function generateContentPiece(
  ctx: McpToolContext,
  args: {
    projectId: number;
    formatType: string;
    targetKeyword: string;
    angleHint?: string;
    intendedPublishPlatform?: string;
  },
): Promise<McpToolResult> {
  try {
    requireApiKeyScope(ctx.key, "content:generate");
    await assertProjectInOrg(args.projectId, ctx.key.organizationId);

    if (!ctx.requestOrigin || !ctx.authorizationHeader) {
      throw new McpToolError(
        "generate_content_piece requires an HTTP MCP session (Authorization + request origin)",
        "failed",
      );
    }

    const billingUserId = await resolveOrgBillingUserId(ctx.key.organizationId);
    if (!billingUserId) {
      throw new McpToolError("Organization has no billing owner", "failed");
    }

    const res = await fetch(`${ctx.requestOrigin}/api/v1/content-pieces/generate`, {
      method: "POST",
      headers: {
        Authorization: ctx.authorizationHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: args.projectId,
        formatType: args.formatType,
        targetKeyword: args.targetKeyword,
        angleHint: args.angleHint,
        intendedPublishPlatform: args.intendedPublishPlatform,
      }),
    });

    const payload = (await res.json().catch(() => ({
      error: "Invalid generate response",
    }))) as { error?: string };

    if (!res.ok) {
      return {
        content: [
          {
            type: "text",
            text: typeof payload.error === "string" ? payload.error : JSON.stringify(payload),
          },
        ],
        isError: true,
        structuredContent: payload,
      };
    }
    return okJson(payload);
  } catch (err) {
    return errResult(err);
  }
}

export async function getPublishReadiness(
  ctx: McpToolContext,
  args: { projectId: number; contentPieceId: number },
): Promise<McpToolResult> {
  try {
    requireApiKeyScope(ctx.key, "content:read");
    await assertProjectInOrg(args.projectId, ctx.key.organizationId);

    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(
        and(
          eq(contentPiecesTable.id, args.contentPieceId),
          eq(contentPiecesTable.websiteProjectId, args.projectId),
        ),
      )
      .limit(1);
    if (!piece) throw new McpToolError("Content piece not found", "not_found");

    const readiness = assessPublishReadiness({
      title: piece.title,
      bodyMarkdown: piece.bodyMarkdown ?? "",
      pieceMetadata: piece.pieceMetadata,
    });

    return okJson({
      contentPieceId: piece.id,
      title: piece.title,
      status: piece.status,
      readiness,
    });
  } catch (err) {
    return errResult(err);
  }
}

export function whoami(ctx: McpToolContext): McpToolResult {
  return okJson({
    organizationId: ctx.key.organizationId,
    keyId: ctx.key.id,
    scopes: ctx.key.scopes,
    rateLimitPerHour: ctx.key.rateLimitPerHour,
  });
}

export async function inspectUrl(
  ctx: McpToolContext,
  args: { projectId: number; inspectionUrl: string; contentPieceId?: number },
): Promise<McpToolResult> {
  try {
    requireApiKeyScope(ctx.key, "content:generate");
    await assertProjectInOrg(args.projectId, ctx.key.organizationId);

    if (!args.inspectionUrl) {
      throw new McpToolError("inspectionUrl is required", "invalid_params");
    }

    const recentlyInspected = await wasRecentlyInspected(args.projectId, args.inspectionUrl);
    if (recentlyInspected) {
      return {
        content: [
          {
            type: "text",
            text: `Rate limit: ${args.inspectionUrl} was already inspected within the last 60 minutes. Try again later.`,
          },
        ],
        isError: true,
      };
    }

    const result = await inspectPublishedUrl({
      projectId: args.projectId,
      inspectionUrl: args.inspectionUrl,
      contentPieceId: args.contentPieceId,
    });

    return okJson({ inspection: result });
  } catch (err) {
    return errResult(err);
  }
}

export async function getBacklinksOverview(
  ctx: McpToolContext,
  args: { projectId: number; referringDomainsLimit?: number },
): Promise<McpToolResult> {
  try {
    requireApiKeyScope(ctx.key, "content:read");
    await assertProjectInOrg(args.projectId, ctx.key.organizationId);

    if (!isBacklinksConfigured()) {
      return {
        content: [
          {
            type: "text",
            text: "Backlinks provider not configured — set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
          },
        ],
        isError: true,
      };
    }

    const [project] = await db
      .select({ url: websiteProjectsTable.url })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, args.projectId))
      .limit(1);
    if (!project) throw new McpToolError("Project not found", "not_found");

    const overview = await fetchBacklinksOverview({
      target: project.url,
      referringDomainsLimit: args.referringDomainsLimit,
    });
    return okJson(overview);
  } catch (err) {
    return errResult(err);
  }
}

export async function getProjectContext(
  ctx: McpToolContext,
  args: { projectId: number },
): Promise<McpToolResult> {
  try {
    requireApiKeyScope(ctx.key, "content:read");
    await assertProjectInOrg(args.projectId, ctx.key.organizationId);

    const [project] = await db
      .select({
        id: websiteProjectsTable.id,
        name: websiteProjectsTable.name,
        url: websiteProjectsTable.url,
      })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, args.projectId))
      .limit(1);
    if (!project) throw new McpToolError("Project not found", "not_found");

    const [brand] = await db
      .select({
        companyName: brandProfilesTable.companyName,
        industry: brandProfilesTable.industry,
        targetAudience: brandProfilesTable.targetAudience,
        primaryKeywords: brandProfilesTable.primaryKeywords,
      })
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, args.projectId))
      .limit(1);

    return okJson({
      project,
      brandProfile: brand
        ? {
            companyName: brand.companyName,
            industry: brand.industry,
            targetAudience: brand.targetAudience,
            primaryKeywords: (brand.primaryKeywords ?? []).slice(0, 6),
          }
        : null,
    });
  } catch (err) {
    return errResult(err);
  }
}
