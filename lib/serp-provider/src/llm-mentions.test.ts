import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  estimateBrandLookupCostUsd,
  isLlmMentionsConfigured,
  lookupBrandMentions,
} from "./llm-mentions";
import {
  computeShareOfVoice,
  detectTarget,
  resolveCompetitorGroups,
  type CrossOutcome,
} from "./share-of-voice";

const originalLogin = process.env["DATAFORSEO_LOGIN"];
const originalPassword = process.env["DATAFORSEO_PASSWORD"];

function setCreds(on: boolean) {
  if (on) {
    process.env["DATAFORSEO_LOGIN"] = "login";
    process.env["DATAFORSEO_PASSWORD"] = "password";
  } else {
    delete process.env["DATAFORSEO_LOGIN"];
    delete process.env["DATAFORSEO_PASSWORD"];
  }
}

function aggregatedBody(
  platform: "chat_gpt" | "google",
  mentions: number,
  volume: number,
) {
  return {
    tasks: [
      {
        status_code: 20000,
        result: [
          {
            total: {
              platform: [
                {
                  key: platform,
                  mentions,
                  ai_search_volume: volume,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function crossBody(
  items: Array<{ key: string; mentions: number | null }>,
  platform: "chat_gpt" | "google",
) {
  return {
    tasks: [
      {
        status_code: 20000,
        result: [
          {
            items: items.map((item) => ({
              key: item.key,
              platform: [
                {
                  key: platform,
                  mentions: item.mentions,
                  ai_search_volume: null,
                },
              ],
            })),
          },
        ],
      },
    ],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalLogin === undefined) delete process.env["DATAFORSEO_LOGIN"];
  else process.env["DATAFORSEO_LOGIN"] = originalLogin;
  if (originalPassword === undefined) delete process.env["DATAFORSEO_PASSWORD"];
  else process.env["DATAFORSEO_PASSWORD"] = originalPassword;
});

describe("isLlmMentionsConfigured", () => {
  it("requires both DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD", () => {
    setCreds(false);
    expect(isLlmMentionsConfigured()).toBe(false);
    process.env["DATAFORSEO_LOGIN"] = "login";
    expect(isLlmMentionsConfigured()).toBe(false);
    process.env["DATAFORSEO_PASSWORD"] = "password";
    expect(isLlmMentionsConfigured()).toBe(true);
  });
});

describe("estimateBrandLookupCostUsd", () => {
  it("charges 0.2 base and +0.2 when competitors are present", () => {
    expect(estimateBrandLookupCostUsd(0)).toBe(0.2);
    expect(estimateBrandLookupCostUsd(1)).toBe(0.4);
    expect(estimateBrandLookupCostUsd(5)).toBe(0.4);
  });
});

describe("detectTarget", () => {
  it("classifies domain vs keyword", () => {
    expect(detectTarget("acme.com")).toEqual({
      type: "domain",
      value: "acme.com",
    });
    expect(detectTarget("https://www.Acme.com/blog")).toEqual({
      type: "domain",
      value: "acme.com",
    });
    expect(detectTarget("Acme Brand")).toEqual({
      type: "keyword",
      value: "Acme Brand",
    });
    expect(detectTarget("nike")).toEqual({ type: "keyword", value: "nike" });
  });
});

describe("computeShareOfVoice", () => {
  it("sums requested rows, excludes nulls, and ignores unrequested rows", () => {
    const outcomes: CrossOutcome[] = [
      {
        platform: "google",
        status: "success",
        items: [
          {
            key: "acme",
            platform: [{ key: "google", mentions: 30 }],
          },
          {
            key: "rival",
            platform: [{ key: "google", mentions: 10 }],
          },
          {
            key: "ghost",
            platform: [{ key: "google", mentions: null }],
          },
          {
            key: "unexpected",
            platform: [{ key: "google", mentions: 60 }],
          },
        ],
      },
    ];

    const entries = computeShareOfVoice(outcomes, "acme", [
      "rival",
      "ghost",
    ])!.entries;

    expect(entries.map((e) => e.label)).toEqual(["acme", "rival", "ghost"]);
    expect(entries[0]).toMatchObject({ label: "acme", sharePct: 75 });
    expect(entries[1]).toMatchObject({ label: "rival", sharePct: 25 });
    expect(entries[2]).toMatchObject({ mentions: null, sharePct: null });
  });

  it("returns null with no competitors or no successful calls", () => {
    expect(computeShareOfVoice([], "acme", [])).toBe(null);
    expect(
      computeShareOfVoice(
        [
          { platform: "chat_gpt", status: "error", items: [] },
          { platform: "google", status: "error", items: [] },
        ],
        "acme",
        ["rival"],
      ),
    ).toBe(null);
  });
});

describe("resolveCompetitorGroups", () => {
  it("dedupes case-insensitively and drops target collisions", () => {
    const groups = resolveCompetitorGroups("Nike", [
      "nike",
      "Adidas",
      "ADIDAS",
      "puma.com",
      "www.PUMA.com",
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Adidas", "puma.com"]);
  });
});

describe("lookupBrandMentions", () => {
  beforeEach(() => {
    setCreds(true);
  });

  it("throws when credentials are missing", async () => {
    setCreds(false);
    await expect(lookupBrandMentions({ query: "acme" })).rejects.toThrow(
      /not configured/,
    );
  });

  it("shapes aggregated totals across ChatGPT and Google only", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => aggregatedBody("chat_gpt", 10, 100),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => aggregatedBody("google", 5, 50),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupBrandMentions({ query: "acme" });

    expect(result.mode).toBe("live");
    expect(result.detectedTargetType).toBe("keyword");
    expect(result.resolvedTarget).toBe("acme");
    expect(result.totalMentions).toBe(15);
    expect(result.totalAiSearchVolume).toBe(150);
    expect(result.hasData).toBe(true);
    expect(result.perPlatform).toHaveLength(2);
    expect(result.perPlatform.map((p) => p.platform)).toEqual([
      "chat_gpt",
      "google",
    ]);
    expect(result.shareOfVoice).toBe(null);
    expect(result.costEstimateUsd).toBe(0.2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const chatBody = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(chatBody[0].location_code).toBe(2840);
    expect(chatBody[0].language_code).toBe("en");
    expect(chatBody[0].target[0]).toMatchObject({
      keyword: "acme",
      match_type: "word_match",
    });
  });

  it("uses a domain target when the query looks like a domain", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => aggregatedBody("chat_gpt", 1, 1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => aggregatedBody("google", 2, 2),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupBrandMentions({ query: "example.com" });

    expect(result.detectedTargetType).toBe("domain");
    expect(result.resolvedTarget).toBe("example.com");
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body[0].target[0]).toMatchObject({
      domain: "example.com",
      include_subdomains: true,
      search_filter: "include",
      search_scope: ["any"],
    });
  });

  it("calls cross_aggregated when competitors are present and builds SoV", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => aggregatedBody("chat_gpt", 20, 200),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => aggregatedBody("google", 10, 100),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          crossBody(
            [
              { key: "acme", mentions: 20 },
              { key: "rival", mentions: 5 },
            ],
            "chat_gpt",
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          crossBody(
            [
              { key: "acme", mentions: 10 },
              { key: "rival", mentions: 5 },
            ],
            "google",
          ),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupBrandMentions({
      query: "acme",
      competitors: ["rival"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.costEstimateUsd).toBe(0.4);
    expect(result.shareOfVoice).not.toBe(null);
    expect(result.shareOfVoice!.platforms).toEqual(["chat_gpt", "google"]);
    const acme = result.shareOfVoice!.entries.find((e) => e.label === "acme");
    const rival = result.shareOfVoice!.entries.find((e) => e.label === "rival");
    expect(acme).toMatchObject({ isTarget: true, mentions: 30, sharePct: 75 });
    expect(rival).toMatchObject({
      isTarget: false,
      mentions: 10,
      sharePct: 25,
    });
  });

  it("records platform errors without inventing extra engines", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => aggregatedBody("google", 7, 70),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupBrandMentions({ query: "acme" });

    expect(result.perPlatform).toEqual([
      {
        platform: "chat_gpt",
        status: "error",
        mentions: 0,
        aiSearchVolume: 0,
        error: "DataForSEO HTTP 500",
      },
      {
        platform: "google",
        status: "success",
        mentions: 7,
        aiSearchVolume: 70,
      },
    ]);
    expect(result.totalMentions).toBe(7);
    expect(result.totalAiSearchVolume).toBe(70);
  });
});
