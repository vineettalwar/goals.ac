import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { extractLocs } from "../sitemap-crawl";
import { fetchPublicText } from "../safe-fetch";
import { originOf } from "./origin";
import { checkRobotsTxt } from "./robots";

export type SitemapResult = {
  url: string;
  urlCount: number;
  urls: string[];
  errors: string[];
  sitemapType: "urlset" | "sitemapindex" | null;
};

const DEFAULT_SITEMAP_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap/sitemap.xml"];
const MAX_SITEMAP_CHILD = 10;
const MAX_URL_SAMPLE = 50;

export async function discoverSitemapCandidates(origin: string): Promise<string[]> {
  const candidates = new Set<string>();
  try {
    const robots = await checkRobotsTxt(origin);
    for (const s of robots.sitemapUrls) candidates.add(s);
  } catch {
    // ignore
  }
  for (const path of DEFAULT_SITEMAP_PATHS) {
    candidates.add(`${origin}${path}`);
  }
  return [...candidates];
}

async function parseSitemapXml(
  sitemapUrl: string,
  xml: string,
): Promise<Omit<SitemapResult, "errors"> & { errors: string[] }> {
  const errors: string[] = [];

  if (/<sitemapindex[\s>]/i.test(xml)) {
    const childSitemaps = extractLocs(xml);
    const allUrls: string[] = [];
    for (const child of childSitemaps.slice(0, MAX_SITEMAP_CHILD)) {
      try {
        await assertPublicUrl(child);
        const childXml = await fetchPublicText(child, {
          accept: "application/xml,text/xml,*/*;q=0.8",
        });
        if (/<urlset[\s>]/i.test(childXml)) {
          allUrls.push(...extractLocs(childXml));
        }
      } catch (err) {
        errors.push(
          `Child sitemap failed (${child}): ${err instanceof Error ? err.message : "error"}`,
        );
      }
    }
    if (allUrls.length === 0 && errors.length === 0) {
      errors.push("Sitemap index had no crawlable child urlsets");
    }
    return {
      url: sitemapUrl,
      urlCount: allUrls.length,
      urls: allUrls.slice(0, MAX_URL_SAMPLE),
      errors,
      sitemapType: "sitemapindex",
    };
  }

  if (/<urlset[\s>]/i.test(xml)) {
    const urls = extractLocs(xml);
    if (urls.length === 0) errors.push("No <loc> entries found in sitemap");
    return {
      url: sitemapUrl,
      urlCount: urls.length,
      urls: urls.slice(0, MAX_URL_SAMPLE),
      errors,
      sitemapType: "urlset",
    };
  }

  return {
    url: sitemapUrl,
    urlCount: 0,
    urls: [],
    errors: ["Response is not a urlset or sitemapindex"],
    sitemapType: null,
  };
}

export async function checkSitemap(siteUrl: string): Promise<SitemapResult> {
  const origin = originOf(siteUrl);
  const candidates = await discoverSitemapCandidates(origin);
  const tryErrors: string[] = [];

  for (const candidate of candidates) {
    try {
      await assertPublicUrl(candidate);
      const xml = await fetchPublicText(candidate, {
        accept: "application/xml,text/xml,*/*;q=0.8",
      });
      const parsed = await parseSitemapXml(candidate, xml);
      if (parsed.sitemapType) {
        return {
          ...parsed,
          errors: [...tryErrors, ...parsed.errors],
        };
      }
      tryErrors.push(`${candidate}: ${parsed.errors[0] ?? "unrecognized"}`);
    } catch (err) {
      tryErrors.push(`${candidate}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  return {
    url: candidates[0] ?? `${origin}/sitemap.xml`,
    urlCount: 0,
    urls: [],
    errors: tryErrors.length > 0 ? tryErrors : ["No sitemap found"],
    sitemapType: null,
  };
}
