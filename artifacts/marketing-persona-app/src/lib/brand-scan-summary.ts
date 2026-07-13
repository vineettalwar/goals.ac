import type { BrandExtract } from "@workspace/content-engine/brand-extract-types";

type DiscoveryMeta = NonNullable<BrandExtract["discoveryMeta"]>;

export function formatBrandScanDiscoverySummary(
  meta: DiscoveryMeta | null | undefined,
  pageCount?: number,
): string | null {
  if (!meta) return null;
  const parts: string[] = [];
  if (meta.sitemap) {
    parts.push(
      meta.sitemapUrlCount
        ? `sitemap (${meta.sitemapUrlCount} URLs)`
        : pageCount
          ? `sitemap (${pageCount} pages)`
          : "sitemap",
    );
  }
  if (meta.gsc) {
    parts.push(meta.gscPageCount ? `GSC (${meta.gscPageCount} pages)` : "GSC");
  }
  if (meta.cms) {
    parts.push(meta.cmsPostCount ? `CMS (${meta.cmsPostCount} posts)` : "CMS");
  }
  if (meta.homepage) {
    parts.push("homepage links");
  }
  return parts.length > 0 ? parts.join(", ") : null;
}
