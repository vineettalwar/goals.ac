export const BRAND_KEY_PATHS = [
  "about",
  "product",
  "products",
  "pricing",
  "solution",
  "solutions",
  "features",
  "platform",
  "services",
  "how-it-works",
  "company",
  "mission",
  "blog",
  "customers",
  "case-studies",
];

export const MAX_SUPPLEMENTAL_BRAND_PAGES = 8;
export const MAX_CMS_EXCERPTS = 10;

export type BrandScanDiscoveryInput = {
  websiteUrl: string;
  sitemapUrls?: string[];
  gscTopPages?: { url: string; impressions: number }[];
  cmsSiteGraph?: {
    url: string;
    excerpt?: string;
    title?: string;
    body?: string;
    contentMarkdown?: string;
  }[];
  homepageLinks?: string[];
};

export type BrandScanDiscoveryMeta = {
  sitemap: boolean;
  gsc: boolean;
  cms: boolean;
  homepage: boolean;
  sitemapUrlCount?: number;
  gscPageCount?: number;
  cmsPostCount?: number;
};

export type BrandScanPlan = {
  pagesToFetch: string[];
  cmsExcerpts: { url: string; text: string; title?: string }[];
  scanSources: string[];
  discoveryMeta: BrandScanDiscoveryMeta;
};

type ScoredUrl = {
  url: string;
  score: number;
  hasExcerpt: boolean;
  excerpt?: string;
  title?: string;
};

export function normalizeBrandScanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.origin}${path}`;
  } catch {
    return url;
  }
}

export function isBrandCriticalPath(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return BRAND_KEY_PATHS.some((keyword) => path.includes(keyword));
  } catch {
    return false;
  }
}

export function pickKeyPages(links: string[], max = MAX_SUPPLEMENTAL_BRAND_PAGES): string[] {
  const picked: string[] = [];
  for (const keyword of BRAND_KEY_PATHS) {
    const match = links.find((l) => {
      try {
        const path = new URL(l).pathname.toLowerCase();
        return path.includes(keyword) && !path.includes("#") && !path.endsWith(".pdf");
      } catch {
        return false;
      }
    });
    if (match && !picked.includes(match)) {
      picked.push(match);
    }
    if (picked.length >= max) break;
  }
  return picked;
}

function sameOrigin(url: string, websiteUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(websiteUrl).origin;
  } catch {
    return false;
  }
}

function impressionsScore(impressions: number): number {
  if (impressions <= 0) return 0;
  return Math.log10(impressions + 1) * 10;
}

export function discoverBrandScanUrls(input: BrandScanDiscoveryInput): BrandScanPlan {
  const homepageNorm = normalizeBrandScanUrl(input.websiteUrl);
  const scored = new Map<string, ScoredUrl>();

  const addUrl = (
    url: string,
    scoreBoost: number,
    opts?: { excerpt?: string; title?: string },
  ) => {
    if (!sameOrigin(url, input.websiteUrl)) return;
    const norm = normalizeBrandScanUrl(url);
    if (norm === homepageNorm) return;

    const pathBoost = isBrandCriticalPath(url) ? 100 : 0;
    const existing = scored.get(norm);
    const nextScore = (existing?.score ?? 0) + scoreBoost + (existing ? 0 : pathBoost);
    scored.set(norm, {
      url,
      score: nextScore,
      hasExcerpt: Boolean(opts?.excerpt) || existing?.hasExcerpt === true,
      excerpt: opts?.excerpt ?? existing?.excerpt,
      title: opts?.title ?? existing?.title,
    });
  };

  const sitemapUrls = input.sitemapUrls ?? [];
  for (const url of sitemapUrls) {
    addUrl(url, 10);
  }

  const homepageLinks = input.homepageLinks ?? [];
  for (const url of homepageLinks) {
    addUrl(url, 5);
  }

  const gscTopPages = input.gscTopPages ?? [];
  for (const { url, impressions } of gscTopPages) {
    addUrl(url, impressionsScore(impressions));
  }

  const cmsSiteGraph = input.cmsSiteGraph ?? [];
  for (const post of cmsSiteGraph) {
    const bodyText = post.contentMarkdown?.trim() || post.body?.trim() || post.excerpt?.trim();
    addUrl(post.url, 5, { excerpt: bodyText, title: post.title });
  }

  let pagesToFetch: string[] = [];
  if (scored.size > 0) {
    pagesToFetch = [...scored.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUPPLEMENTAL_BRAND_PAGES)
      .map((entry) => entry.url);
  } else if (homepageLinks.length > 0) {
    pagesToFetch = pickKeyPages(homepageLinks);
  }

  const fetchedSet = new Set(pagesToFetch.map(normalizeBrandScanUrl));
  const cmsExcerpts: { url: string; text: string; title?: string }[] = [];

  const excerptCandidates = [...scored.values()]
    .filter((entry) => !fetchedSet.has(normalizeBrandScanUrl(entry.url)) && entry.excerpt?.trim())
    .sort((a, b) => b.score - a.score);

  for (const entry of excerptCandidates) {
    const text = entry.excerpt!.trim();
    cmsExcerpts.push({ url: entry.url, text, title: entry.title });
    if (cmsExcerpts.length >= MAX_CMS_EXCERPTS) break;
  }

  const scanSources = [
    input.websiteUrl,
    ...pagesToFetch,
    ...cmsExcerpts.map((e) => e.url),
  ];
  const uniqueScanSources = [...new Set(scanSources.map(normalizeBrandScanUrl))].map((norm) => {
    if (norm === homepageNorm) return input.websiteUrl;
    return (
      pagesToFetch.find((u) => normalizeBrandScanUrl(u) === norm) ??
      cmsExcerpts.find((e) => normalizeBrandScanUrl(e.url) === norm)?.url ??
      norm
    );
  });

  return {
    pagesToFetch,
    cmsExcerpts,
    scanSources: uniqueScanSources,
    discoveryMeta: {
      sitemap: sitemapUrls.length > 0,
      gsc: gscTopPages.length > 0,
      cms: cmsSiteGraph.length > 0,
      homepage: homepageLinks.length > 0,
      sitemapUrlCount: sitemapUrls.length,
      gscPageCount: gscTopPages.length,
      cmsPostCount: cmsSiteGraph.length,
    },
  };
}
