import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Same fake TTL adapter as brand-scrape-page-cache.test.ts, kept local to avoid cross-file shared state. */
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

vi.mock("@workspace/security/ssrf-guard", () => ({
  assertPublicUrl: async () => {},
}));

import { fetchPage } from "./brand-scraper";

describe("brand-scraper fetchPage cache wiring", () => {
  beforeEach(() => {
    fakeCache["map" as never] = new Map() as never;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches over the network on a cache miss, then caches the result", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => "<html>v1</html>" }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchPage("https://example.com/page", { websiteProjectId: 1 });
    expect(first).toBe("<html>v1</html>");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses the cached page instead of re-fetching on a hit within the TTL", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => "<html>v1</html>" }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchPage("https://example.com/page", { websiteProjectId: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await fetchPage("https://example.com/page", { websiteProjectId: 2 });
    expect(second).toBe("<html>v1</html>");
    // Still one network call: the second call was served from cache.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("bypasses the cache and re-fetches when refresh is set", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => "<html>v1</html>" })
      .mockResolvedValueOnce({ ok: true, text: async () => "<html>v2</html>" });
    vi.stubGlobal("fetch", fetchMock);

    await fetchPage("https://example.com/page", { websiteProjectId: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const refreshed = await fetchPage("https://example.com/page", { websiteProjectId: 3, refresh: true });
    expect(refreshed).toBe("<html>v2</html>");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never caches a failed (non-2xx) fetch", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);

    const failed = await fetchPage("https://example.com/missing", { websiteProjectId: 4 });
    expect(failed).toBeNull();

    // A subsequent success for the same url must still hit the network,
    // proving the failed response above was never written to cache.
    const okFetchMock = vi.fn(async () => ({ ok: true, text: async () => "<html>ok</html>" }));
    vi.stubGlobal("fetch", okFetchMock);
    const ok = await fetchPage("https://example.com/missing", { websiteProjectId: 4 });
    expect(ok).toBe("<html>ok</html>");
    expect(okFetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps separate cache entries per website project for the same url", async () => {
    const fetchMockA = vi.fn(async () => ({ ok: true, text: async () => "<html>project-a</html>" }));
    vi.stubGlobal("fetch", fetchMockA);
    await fetchPage("https://example.com/shared", { websiteProjectId: 10 });

    const fetchMockB = vi.fn(async () => ({ ok: true, text: async () => "<html>project-b</html>" }));
    vi.stubGlobal("fetch", fetchMockB);
    const forOtherProject = await fetchPage("https://example.com/shared", { websiteProjectId: 11 });

    expect(forOtherProject).toBe("<html>project-b</html>");
    expect(fetchMockB).toHaveBeenCalledTimes(1);
  });
});
