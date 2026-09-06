import { withCors } from "@workspace/cf-edge/cors";
import { listAccessibleProjects } from "@workspace/cf-edge/project-access";
import { db } from "./db";
import {
  brandProfilesTable,
  contentPiecesTable,
  keywordAnalysesTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import type { CmsIntegrationCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { loadCompetitorGenerationContext } from "@workspace/content-engine/support/competitor/competitor-generation-context";
import { eq } from "drizzle-orm";
import { getAccessibleProject, parsePositiveInt } from "./project-access";

export async function handleResearchRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;
  const url = new URL(request.url);

  if (path === "/api/user/cms-summary" && method === "GET") {
    const projects = await listAccessibleProjects(userId);

    let hasNotion = false;
    let hasWebflow = false;
    let hasWordpress = false;
    let hasGhost = false;
    let hasWebhook = false;
    let hasShopify = false;
    let hasDrupal = false;
    let hasJoomla = false;
    let hasLinkedin = false;
    let hasTwitter = false;
    let hasMeta = false;
    let hasBluesky = false;
    let hasMastodon = false;

    for (const project of projects) {
      const stored = (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
      if (stored.notion) hasNotion = true;
      if (stored.webflow) hasWebflow = true;
      if (stored.wordpress) hasWordpress = true;
      if (stored.ghost) hasGhost = true;
      if (stored.webhook) hasWebhook = true;
      if (stored.shopify) hasShopify = true;
      if (stored.drupal) hasDrupal = true;
      if (stored.joomla) hasJoomla = true;
      if (stored.linkedin) hasLinkedin = true;
      if (stored.twitter) hasTwitter = true;
      if (stored.meta) hasMeta = true;
      if (stored.bluesky) hasBluesky = true;
      if (stored.mastodon) hasMastodon = true;
    }

    return withCors(
      request,
      Response.json({
        notion: hasNotion,
        webflow: hasWebflow,
        wordpress: hasWordpress,
        ghost: hasGhost,
        webhook: hasWebhook,
        shopify: hasShopify,
        drupal: hasDrupal,
        joomla: hasJoomla,
        linkedin: hasLinkedin,
        twitter: hasTwitter,
        meta: hasMeta,
        bluesky: hasBluesky,
        mastodon: hasMastodon,
      }),
    );
  }

  if (path === "/api/internal-links" && method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    if (!projectId) {
      return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
    }

    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [[projectRow], pieces] = await Promise.all([
      db
        .select({ url: websiteProjectsTable.url })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1),
      db
        .select({
          id: contentPiecesTable.id,
          title: contentPiecesTable.title,
          status: contentPiecesTable.status,
          pieceMetadata: contentPiecesTable.pieceMetadata,
        })
        .from(contentPiecesTable)
        .where(eq(contentPiecesTable.websiteProjectId, projectId))
        .limit(50),
    ]);

    type PageNode = {
      id: string;
      title: string;
      slug: string;
      inbound: number;
      outbound: number;
      status: string;
    };
    const pages: PageNode[] = [];

    for (const piece of pieces) {
      const meta = (piece.pieceMetadata ?? {}) as {
        internalLinkSuggestions?: { suggestedSlug: string }[];
      };
      const outbound = meta.internalLinkSuggestions?.length ?? 0;
      const slug = piece.title.toLowerCase().replace(/\s+/g, "-").slice(0, 48);
      pages.push({
        id: `piece-${piece.id}`,
        title: piece.title,
        slug,
        inbound: 0,
        outbound,
        status: piece.status,
      });
    }

    const slugSet = new Map(pages.map((page) => [page.slug, page]));
    for (const piece of pieces) {
      const meta = (piece.pieceMetadata ?? {}) as {
        internalLinkSuggestions?: { suggestedSlug: string }[];
      };
      for (const link of meta.internalLinkSuggestions ?? []) {
        const normalized =
          link.suggestedSlug.replace(/^\//, "").split("/").pop() ?? link.suggestedSlug;
        const target =
          slugSet.get(normalized) ??
          [...slugSet.values()].find((page) => link.suggestedSlug.includes(page.slug));
        if (target) target.inbound += 1;
      }
    }

    const orphans = pages.filter((page) => page.inbound === 0 && page.status === "published");
    const suggestions = pieces.flatMap((piece) => {
      const meta = (piece.pieceMetadata ?? {}) as {
        internalLinkSuggestions?: {
          anchorText: string;
          suggestedSlug: string;
          rationale: string;
        }[];
      };
      return (meta.internalLinkSuggestions ?? []).map((suggestion) => ({
        fromTitle: piece.title,
        anchorText: suggestion.anchorText,
        suggestedSlug: suggestion.suggestedSlug,
        rationale: suggestion.rationale,
      }));
    });

    const coverageScore =
      pages.length === 0 ? 0 : Math.round(((pages.length - orphans.length) / pages.length) * 100);

    const [brand] = await db
      .select({ primaryKeywords: brandProfilesTable.primaryKeywords })
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);

    return withCors(
      request,
      Response.json({
        projectUrl: projectRow?.url,
        coverageScore,
        pageCount: pages.length,
        orphanCount: orphans.length,
        pages,
        orphans,
        suggestions: suggestions.slice(0, 20),
        brandKeywords: brand?.primaryKeywords ?? [],
      }),
    );
  }

  const competitorsMatch = path.match(/^\/api\/website-projects\/(\d+)\/competitors$/);
  if (competitorsMatch && method === "GET") {
    const projectId = Number.parseInt(competitorsMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [[brandProfile], context] = await Promise.all([
      db
        .select({ industry: brandProfilesTable.industry })
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, projectId))
        .limit(1),
      loadCompetitorGenerationContext(projectId),
    ]);

    return withCors(
      request,
      Response.json({
        competitorUrls: context.competitorUrls,
        industry: brandProfile?.industry ?? "",
        competitorPositioning: context.competitorPositioning ?? "",
        analyses: context.analyses.map((analysis) => ({
          competitorUrl: analysis.competitorUrl,
          competitorName: analysis.competitorName,
          contentGaps: analysis.contentGaps,
          quickWins: analysis.quickWins,
          threatLevel: analysis.threatLevel,
        })),
      }),
    );
  }

  const keywordAnalysisMatch = path.match(/^\/api\/keyword-analyses\/(\d+)$/);
  if (keywordAnalysisMatch && method === "GET") {
    const analysisId = Number.parseInt(keywordAnalysisMatch[1]!, 10);
    const [row] = await db
      .select()
      .from(keywordAnalysesTable)
      .where(eq(keywordAnalysesTable.id, analysisId))
      .limit(1);

    if (!row) {
      return withCors(request, Response.json({ error: "Keyword analysis not found" }, { status: 404 }));
    }

    if (row.websiteProjectId) {
      const project = await getAccessibleProject(row.websiteProjectId, userId);
      if (!project) {
        return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
      }
    }

    return withCors(
      request,
      Response.json({ id: row.id, ...row.result, createdAt: row.createdAt }),
    );
  }

  return null;
}
