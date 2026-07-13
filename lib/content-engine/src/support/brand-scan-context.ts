import { and, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  brandProfilesTable,
  gscSearchQueriesTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { fetchGoalsAcSiteGraph, type GoalsAcPluginCredentials } from "@workspace/connectors/goals-ac-plugin";
import { defaultSyncDateRange } from "@workspace/seo-tools/gscSearchAnalytics";
import { fetchSitemapInfo, type SitemapCrawlData } from "@workspace/seo-tools/sitemap-crawl";
import {
  decryptCmsCredentials,
  type CmsIntegrationCredentials,
} from "./cms-integrations";
import type { BrandScanDiscoveryInput } from "../brand-scan-discovery";
import { logger } from "../logger";

type SiteGraphPost = {
  url?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  contentMarkdown?: string;
  content_markdown?: string;
};

type SiteGraphResponse = {
  posts?: SiteGraphPost[];
};

function pluginCredentialsFromCms(
  creds: CmsIntegrationCredentials,
): GoalsAcPluginCredentials | null {
  if (creds.wordpress?.siteUrl && creds.wordpress.siteKey) {
    return {
      siteUrl: creds.wordpress.siteUrl,
      siteKey: creds.wordpress.siteKey,
      platform: "wordpress",
    };
  }
  if (creds.drupal?.siteUrl && creds.drupal.siteKey) {
    return {
      siteUrl: creds.drupal.siteUrl,
      siteKey: creds.drupal.siteKey,
      platform: "drupal",
    };
  }
  if (creds.joomla?.siteUrl && creds.joomla.siteKey) {
    return {
      siteUrl: creds.joomla.siteUrl,
      siteKey: creds.joomla.siteKey,
      platform: "joomla",
    };
  }
  if (creds.shopify?.siteUrl && creds.shopify.siteKey) {
    return {
      siteUrl: creds.shopify.siteUrl,
      siteKey: creds.shopify.siteKey,
      platform: "shopify",
    };
  }
  return null;
}

async function loadGscTopPages(
  projectId: number,
  limit = 20,
): Promise<{ url: string; impressions: number }[]> {
  const dateRange = defaultSyncDateRange(28);
  const rows = await db
    .select({
      page: gscSearchQueriesTable.page,
      impressions: sql<number>`sum(${gscSearchQueriesTable.impressions})::int`,
    })
    .from(gscSearchQueriesTable)
    .where(
      and(
        eq(gscSearchQueriesTable.projectId, projectId),
        gte(gscSearchQueriesTable.date, dateRange.startDate),
        lte(gscSearchQueriesTable.date, dateRange.endDate),
        isNotNull(gscSearchQueriesTable.page),
      ),
    )
    .groupBy(gscSearchQueriesTable.page)
    .orderBy(desc(sql`sum(${gscSearchQueriesTable.impressions})`))
    .limit(limit);

  return rows
    .filter((row): row is { page: string; impressions: number } => Boolean(row.page))
    .map((row) => ({ url: row.page, impressions: row.impressions }));
}

async function loadCmsSiteGraph(
  cmsIntegrations: unknown,
): Promise<{
  url: string;
  excerpt?: string;
  title?: string;
  body?: string;
  contentMarkdown?: string;
}[]> {
  if (!cmsIntegrations || typeof cmsIntegrations !== "object") return [];

  const creds = decryptCmsCredentials(cmsIntegrations as CmsIntegrationCredentials);
  const pluginCreds = pluginCredentialsFromCms(creds);
  if (!pluginCreds) return [];

  try {
    const graph = await fetchGoalsAcSiteGraph<SiteGraphResponse>(pluginCreds);
    return (graph.posts ?? [])
      .filter((post): post is SiteGraphPost & { url: string } => Boolean(post.url))
      .map((post) => ({
        url: post.url,
        excerpt: post.excerpt,
        title: post.title,
        body: post.body,
        contentMarkdown: post.contentMarkdown ?? post.content_markdown,
      }));
  } catch (err) {
    logger.warn({ err, platform: pluginCreds.platform }, "CMS site-graph fetch failed for brand scan");
    return [];
  }
}

export type BrandScanContext = BrandScanDiscoveryInput & {
  crawlData: SitemapCrawlData | null;
  sitemapUrl: string | null;
  pageCount: number;
};

export async function persistSitemapCrawl(
  projectId: number,
  websiteUrl: string,
): Promise<{ sitemapUrl: string | null; pageCount: number; crawlData: SitemapCrawlData | null }> {
  const result = await fetchSitemapInfo(websiteUrl);
  await db
    .update(websiteProjectsTable)
    .set({
      sitemapUrl: result.sitemapUrl,
      pageCount: result.pageCount,
      crawlData: result.crawlData,
      crawlStatus: "done",
    })
    .where(eq(websiteProjectsTable.id, projectId));

  return result;
}

export async function loadBrandScanContext(
  projectId: number,
  options?: { refreshSitemap?: boolean },
): Promise<BrandScanContext | null> {
  const [project] = await db
    .select({
      url: websiteProjectsTable.url,
      crawlData: websiteProjectsTable.crawlData,
      sitemapUrl: websiteProjectsTable.sitemapUrl,
      pageCount: websiteProjectsTable.pageCount,
      cmsIntegrations: websiteProjectsTable.cmsIntegrations,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project) return null;

  let crawlData = (project.crawlData as SitemapCrawlData | null) ?? null;
  let sitemapUrl = project.sitemapUrl;
  let pageCount = project.pageCount ?? 0;

  if (options?.refreshSitemap || !crawlData?.pageUrls?.length) {
    try {
      const refreshed = await persistSitemapCrawl(projectId, project.url);
      crawlData = refreshed.crawlData;
      sitemapUrl = refreshed.sitemapUrl;
      pageCount = refreshed.pageCount;
    } catch (err) {
      logger.warn({ err, projectId }, "Sitemap crawl failed; continuing with homepage discovery");
    }
  }

  const [gscTopPages, cmsSiteGraph] = await Promise.all([
    loadGscTopPages(projectId),
    loadCmsSiteGraph(project.cmsIntegrations),
  ]);

  return {
    websiteUrl: project.url,
    sitemapUrls: crawlData?.pageUrls ?? [],
    gscTopPages,
    cmsSiteGraph,
    crawlData,
    sitemapUrl,
    pageCount: pageCount ?? 0,
  };
}

const AUTO_BRAND_REFRESH_MIN_MS = 24 * 60 * 60 * 1000;

export async function shouldAutoRefreshBrandAfterGscSync(projectId: number): Promise<boolean> {
  const [brand] = await db
    .select({ brandMemory: brandProfilesTable.brandMemory })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const lastScannedAt = brand?.brandMemory?.lastScannedAt;
  if (!lastScannedAt) return true;

  const elapsed = Date.now() - new Date(lastScannedAt).getTime();
  return elapsed >= AUTO_BRAND_REFRESH_MIN_MS;
}

/** Load full CMS post bodies for brand voice indexing. */
export async function loadCmsContentForBrandVoice(
  projectId: number,
): Promise<
  import("../brand-voice-indexer").BrandVoiceIngestDocument[]
> {
  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project) return [];

  const posts = await loadCmsSiteGraph(project.cmsIntegrations);
  return posts
    .map((post) => {
      const text =
        post.contentMarkdown?.trim() ||
        post.body?.trim() ||
        (post.title && post.excerpt
          ? `${post.title}\n\n${post.excerpt}`
          : post.excerpt?.trim() || "");
      if (!text || text.length < 80) return null;
      return {
        sourceType: "cms" as const,
        sourceUrl: post.url,
        title: post.title ?? "",
        text,
        replaceExisting: true,
      };
    })
    .filter((doc): doc is NonNullable<typeof doc> => doc !== null);
}
