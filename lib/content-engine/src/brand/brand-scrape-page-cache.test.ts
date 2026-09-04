import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Stand-in for the shared CacheAdapter (getCache()'s KV/Redis/in-memory LRU
 * result) that actually honours TTL, since the real in-memory adapter isn't
 * exported for direct use in tests.
 */
class FakeTtlCache {
  private readonly map = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

const fakeCache = new FakeTtlCache();

vi.mock("../core/cache", () => ({
  getCache: async () => fakeCache,
}));

import {
  buildBrandScrapePageCacheKey,
  getCachedBrandScrapePage,
  setCachedBrandScrapePage,
  BRAND_SCRAPE_PAGE_CACHE_TTL_MS,
} from "./brand-scrape-page-cache";

describe("brand-scrape-page-cache", () => {
  beforeEach(() => {
    fakeCache["map" as never] = new Map() as never;
    vi.useRealTimers();
  });

  it("builds a stable key for the same url and project scope", () => {
    expect(buildBrandScrapePageCacheKey("https://example.com/", 42)).toBe(
      buildBrandScrapePageCacheKey("https://example.com/", 42),
    );
  });

  it("scopes the key per website project so projects never share a cache entry", () => {
    const a = buildBrandScrapePageCacheKey("https://example.com/", 1);
    const b = buildBrandScrapePageCacheKey("https://example.com/", 2);
    expect(a).not.toBe(b);
  });

  it("falls back to a global scope when no project id is given", () => {
    const withProject = buildBrandScrapePageCacheKey("https://example.com/", 1);
    const withoutProject = buildBrandScrapePageCacheKey("https://example.com/");
    expect(withoutProject).not.toBe(withProject);
    // Stable across calls for the same unscoped url.
    expect(buildBrandScrapePageCacheKey("https://example.com/")).toBe(withoutProject);
  });

  it("misses on an unset key", async () => {
    const result = await getCachedBrandScrapePage("https://nowhere.example/page", 1);
    expect(result).toBeNull();
  });

  it("hits after a set, scoped to the same project", async () => {
    await setCachedBrandScrapePage("https://example.com/about", "<html>about</html>", 7);
    const hit = await getCachedBrandScrapePage("https://example.com/about", 7);
    expect(hit).toBe("<html>about</html>");
  });

  it("misses for a different project scope even with the same url", async () => {
    await setCachedBrandScrapePage("https://example.com/about", "<html>about</html>", 7);
    const miss = await getCachedBrandScrapePage("https://example.com/about", 8);
    expect(miss).toBeNull();
  });

  it("expires after the TTL window", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    await setCachedBrandScrapePage("https://example.com/pricing", "<html>pricing</html>", 3);
    expect(await getCachedBrandScrapePage("https://example.com/pricing", 3)).toBe(
      "<html>pricing</html>",
    );

    vi.setSystemTime(now + BRAND_SCRAPE_PAGE_CACHE_TTL_MS + 1000);
    expect(await getCachedBrandScrapePage("https://example.com/pricing", 3)).toBeNull();
  });

  it("returns null for a malformed cached payload instead of throwing", async () => {
    const cache = await (await import("../core/cache")).getCache();
    await cache.set(buildBrandScrapePageCacheKey("https://example.com/broken", 9), "not-json", 60_000);
    const result = await getCachedBrandScrapePage("https://example.com/broken", 9);
    expect(result).toBeNull();
  });
});
