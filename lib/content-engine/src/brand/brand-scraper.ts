import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import type { BrandExtract, Confidence } from "./brand-extract-types";
import { extractInternalLinks } from "./brand-scraper-links";
import { getCachedBrandScrapePage, setCachedBrandScrapePage } from "./brand-scrape-page-cache";

export type { BrandExtract, Confidence } from "./brand-extract-types";
export { extractInternalLinks } from "./brand-scraper-links";
export type { ScrapeBrandProfileOptions } from "./brand-scraper-profile";
export { scrapeBrandProfile } from "./brand-scraper-profile";

// Same shape as AUDIT_USER_AGENT in seo-tools — WAFs reset "compatible; Bot/1.0" strings.
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECT_HOPS = 5;

export type FetchPageOptions = {
  websiteProjectId?: number;
  /** Bypass the cached read (force rescan), but still write the fresh fetch back to cache. */
  refresh?: boolean;
  /** Skip the TTL cache entirely, read and write: the one-off robots.txt fetch. */
  noCache?: boolean;
};

// Exported for tests only (cache-hit / refresh-bypass wiring); not part of
// the module's intended public surface.
export async function fetchPage(url: string, opts: FetchPageOptions = {}): Promise<string | null> {
  try {
    await assertPublicUrl(url);
  } catch {
    return null;
  }

  const cacheEnabled = !opts.noCache;
  if (cacheEnabled && !opts.refresh) {
    const cached = await getCachedBrandScrapePage(url, opts.websiteProjectId);
    if (cached != null) return cached;
  }

  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: FETCH_HEADERS,
      });
      clearTimeout(timeout);
      const status = resp.status ?? 0;
      if (REDIRECT_STATUSES.has(status)) {
        const location = resp.headers?.get?.("location");
        if (!location) return null;
        current = new URL(location, current).toString();
        try {
          await assertPublicUrl(current);
        } catch {
          return null;
        }
        continue;
      }
      if (!resp.ok) return null;
      const html = await resp.text();
      // Only a successful fetch is cacheable — never cache the SSRF-guard
      // rejection above or a non-2xx/network failure below.
      if (cacheEnabled) {
        await setCachedBrandScrapePage(url, html, opts.websiteProjectId);
      }
      return html;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }
  return null;
}

/**
 * Same text extraction as stripHtml, but block structure survives as
 * newlines: paragraph breaks, list markers and heading lines. The style
 * vector measures paragraph shape, list use and heading density, and
 * stripHtml collapses all whitespace to single spaces, so measuring its
 * output reports every page as one unbroken paragraph with no lists and no
 * headings. Only the style vector reads this; the prompt text, the page
 * documents and the brand-voice index keep the stripHtml output they have
 * always had.
 */
export function stripHtmlStructured(html: string, maxChars = 8000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Headings and list items carry their markdown marker so the line scan
    // in computeStyleVector recognises them.
    .replace(/<h([1-6])[^>]*>/gi, (_match, level: string) => `\n\n${"#".repeat(Number(level))} `)
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|tr|blockquote|ul|ol|table)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    // Collapse runs of spaces and tabs, but keep line breaks. Three or more
    // blank lines read the same as one paragraph break.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}
