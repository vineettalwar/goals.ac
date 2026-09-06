import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { fetchPublicText } from "./safe-fetch";

export type SitemapCrawlData = {
  sitemapType: "urlset" | "sitemapindex";
  pageUrls: string[];
  lastCrawledAt: string;
};

export type SitemapInfoResult = {
  sitemapUrl: string | null;
  pageCount: number;
  crawlData: SitemapCrawlData | null;
};

const DEFAULT_SITEMAP_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap/sitemap.xml"];

async function fetchXml(url: string): Promise<string | null> {
  try {
    return await fetchPublicText(url, {
      timeoutMs: 8000,
      accept: "application/xml,text/xml,text/plain,*/*;q=0.8",
    });
  } catch {
    return null;
  }
}

export function extractLocs(xml: string): string[] {
  return (xml.match(/<loc>\s*(.*?)\s*<\/loc>/g) ?? [])
    .map((m) => m.replace(/<\/?loc>/g, "").trim())
    .filter(Boolean);
}

async function discoverSitemapCandidates(baseUrl: string): Promise<string[]> {
  const candidates = new Set<string>();

  const robotsUrl = `${baseUrl}/robots.txt`;
  try {
    await assertPublicUrl(robotsUrl);
    const robotsText = await fetchXml(robotsUrl);
    if (robotsText) {
      for (const line of robotsText.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith("sitemap:")) {
          candidates.add(trimmed.slice(8).trim());
        }
      }
    }
  } catch {
    // robots.txt unavailable or blocked
  }

  for (const path of DEFAULT_SITEMAP_PATHS) {
    candidates.add(`${baseUrl}${path}`);
  }

  return [...candidates];
}

async function parseSitemapCandidate(candidate: string): Promise<SitemapInfoResult | null> {
  const text = await fetchXml(candidate);
  if (!text) return null;

  if (text.includes("<sitemapindex")) {
    const subSitemapUrls = extractLocs(text);
    const allPageUrls: string[] = [];

    for (const subUrl of subSitemapUrls.slice(0, 10)) {
      try {
        await assertPublicUrl(subUrl);
      } catch {
        continue;
      }
      const subText = await fetchXml(subUrl);
      if (subText && subText.includes("<urlset")) {
        allPageUrls.push(...extractLocs(subText));
      }
    }

    const crawlData: SitemapCrawlData = {
      sitemapType: "sitemapindex",
      pageUrls: allPageUrls.slice(0, 200),
      lastCrawledAt: new Date().toISOString(),
    };
    return {
      sitemapUrl: candidate,
      pageCount: allPageUrls.length,
      crawlData,
    };
  }

  if (text.includes("<urlset")) {
    const pageUrls = extractLocs(text);
    const crawlData: SitemapCrawlData = {
      sitemapType: "urlset",
      pageUrls: pageUrls.slice(0, 200),
      lastCrawledAt: new Date().toISOString(),
    };
    return { sitemapUrl: candidate, pageCount: pageUrls.length, crawlData };
  }

  return null;
}

export async function fetchSitemapInfo(url: string): Promise<SitemapInfoResult> {
  const baseUrl = new URL(url).origin;
  await assertPublicUrl(baseUrl);

  const candidates = await discoverSitemapCandidates(baseUrl);

  for (const candidate of candidates) {
    try {
      await assertPublicUrl(candidate);
    } catch {
      continue;
    }
    const result = await parseSitemapCandidate(candidate);
    if (result) return result;
  }

  return { sitemapUrl: null, pageCount: 0, crawlData: null };
}
