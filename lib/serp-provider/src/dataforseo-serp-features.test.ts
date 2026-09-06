import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataForSeoProvider } from "./dataforseo";

function mockSerpResponse(items: Array<Record<string, unknown>>) {
  return {
    tasks: [
      {
        status_code: 20000,
        status_message: "Ok.",
        result: [{ items }],
      },
    ],
  };
}

const ITEMS_RICH = [
  { type: "ai_overview", rank_absolute: 0 },
  { type: "featured_snippet", rank_absolute: 1, url: "https://example.com/fs", title: "FS" },
  { type: "organic", rank_absolute: 2, url: "https://target.com/page", title: "Target" },
  { type: "organic", rank_absolute: 3, url: "https://other.com", title: "Other" },
  { type: "people_also_ask", items: [{ question: "What is SEO?" }] },
  { type: "local_pack", rank_absolute: 5 },
  { type: "knowledge_graph", rank_absolute: 6 },
  { type: "video", rank_absolute: 7 },
];

describe("DataForSeoProvider – serpFeatures enrichment", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("DATAFORSEO_LOGIN", "test");
    vi.stubEnv("DATAFORSEO_PASSWORD", "test");
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fetchSpy.mockRestore();
  });

  it("populates featureTypes with all unique item types", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockSerpResponse(ITEMS_RICH)), { status: 200 }),
    );

    const provider = new DataForSeoProvider();
    const result = await provider.checkRank({ keyword: "seo tools", targetUrl: "https://target.com" });
    const sf = result.serpFeatures as Record<string, unknown>;

    const featureTypes = sf.featureTypes as string[];
    expect(featureTypes).toContain("organic");
    expect(featureTypes).toContain("featured_snippet");
    expect(featureTypes).toContain("ai_overview");
    expect(featureTypes).toContain("local_pack");
    expect(featureTypes).toContain("knowledge_graph");
    expect(featureTypes).toContain("video");
    // no duplicates
    expect(featureTypes.length).toBe(new Set(featureTypes).size);
  });

  it("sets aiOverview true when ai_overview item present", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockSerpResponse(ITEMS_RICH)), { status: 200 }),
    );

    const provider = new DataForSeoProvider();
    const result = await provider.checkRank({ keyword: "test" });
    expect(result.serpFeatures.aiOverview).toBe(true);
  });

  it("sets localPack and knowledgeGraph booleans", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockSerpResponse(ITEMS_RICH)), { status: 200 }),
    );

    const provider = new DataForSeoProvider();
    const result = await provider.checkRank({ keyword: "test" });
    expect(result.serpFeatures.localPack).toBe(true);
    expect(result.serpFeatures.knowledgeGraph).toBe(true);
  });

  it("sets booleans to false when features absent", async () => {
    const items = [
      { type: "organic", rank_absolute: 1, url: "https://a.com", title: "A" },
      { type: "organic", rank_absolute: 2, url: "https://b.com", title: "B" },
    ];
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockSerpResponse(items)), { status: 200 }),
    );

    const provider = new DataForSeoProvider();
    const result = await provider.checkRank({ keyword: "simple" });
    const sf = result.serpFeatures as Record<string, unknown>;
    expect(sf.aiOverview).toBe(false);
    expect(sf.localPack).toBe(false);
    expect(sf.knowledgeGraph).toBe(false);
    expect(sf.featuredSnippet).toBe(false);
    expect((sf.featureTypes as string[])).toEqual(["organic"]);
  });

  it("preserves backward-compatible fields", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockSerpResponse(ITEMS_RICH)), { status: 200 }),
    );

    const provider = new DataForSeoProvider();
    const result = await provider.checkRank({ keyword: "seo", targetUrl: "https://target.com" });
    const sf = result.serpFeatures as Record<string, unknown>;

    expect(typeof sf.organicCount).toBe("number");
    expect(sf.featuredSnippet).toBe(true);
    expect(Array.isArray(sf.peopleAlsoAsk)).toBe(true);
    expect(Array.isArray(sf.topResults)).toBe(true);
    // position found via target match
    expect(result.position).toBe(2);
    expect(result.rankingUrl).toBe("https://target.com/page");
  });
});
