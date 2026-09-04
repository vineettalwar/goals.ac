import crypto from "crypto";
import { getCache } from "../core/cache";

/**
 * TTL cache for raw page fetches made by the brand scraper. Every brand
 * scan/rescan re-fetches every discovered page from scratch today, which
 * wastes bandwidth and risks tripping rate limits on the target site when a
 * project is rescanned repeatedly within a short window. Mirrors the
 * `semrush-gap-cache.ts` pattern: a thin key-fingerprint layer over the
 * shared `getCache()` adapter (Cloudflare KV / Redis / in-memory LRU,
 * whichever is available), no bespoke storage.
 *
 * 24h matches the existing `brandMemory.lastScannedAt` refresh convention
 * (see HANDOFF.md) — a page fetched for one scan is still fresh enough to
 * reuse for a same-day rescan.
 */
export const BRAND_SCRAPE_PAGE_CACHE_TTL_MS = 24 * 60 * 60_000;

type CachedBrandScrapePage = {
  /** Raw HTML as fetched, before stripHtml/stripHtmlStructured/extractInternalLinks run on it. */
  html: string;
  fetchedAt: number;
};

/**
 * Cache key is scoped per website project when one is known, so one
 * customer's scan of a shared/aggregator page can't serve stale content
 * cached under a different project, and so the cache can be reasoned about
 * per project. Falls back to a global scope for scrapes not tied to a
 * project (e.g. ad hoc/preview scrapes).
 */
export function buildBrandScrapePageCacheKey(url: string, websiteProjectId?: number): string {
  const fingerprint = crypto.createHash("sha256").update(url).digest("hex").slice(0, 24);
  const scope = websiteProjectId != null ? String(websiteProjectId) : "global";
  return `brand:scrape-page:v1:${scope}:${fingerprint}`;
}

/** Returns cached HTML for `url` if present and unexpired, else null. Never throws. */
export async function getCachedBrandScrapePage(
  url: string,
  websiteProjectId?: number,
): Promise<string | null> {
  const cache = await getCache();
  const raw = await cache.get(buildBrandScrapePageCacheKey(url, websiteProjectId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedBrandScrapePage;
    return typeof parsed.html === "string" ? parsed.html : null;
  } catch {
    return null;
  }
}

/**
 * Stores a successfully fetched page's HTML. Callers must only call this on
 * a successful (2xx) fetch — never cache an SSRF-guard rejection, a
 * non-2xx response, or a network error, so a transient failure doesn't get
 * "cached" as if it were the page's real content.
 */
export async function setCachedBrandScrapePage(
  url: string,
  html: string,
  websiteProjectId?: number,
): Promise<void> {
  const cache = await getCache();
  const payload: CachedBrandScrapePage = { html, fetchedAt: Date.now() };
  await cache.set(
    buildBrandScrapePageCacheKey(url, websiteProjectId),
    JSON.stringify(payload),
    BRAND_SCRAPE_PAGE_CACHE_TTL_MS,
  );
}
