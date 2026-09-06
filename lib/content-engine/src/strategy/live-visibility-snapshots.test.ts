import { describe, expect, it } from "vitest";
import type { BrandLookupResult } from "@workspace/serp-provider";
import {
  brandLookupQuery,
  liveVisibilitySnapshotsFromLookup,
  LIVE_PROMPT,
} from "./live-visibility-snapshots";

function baseResult(overrides: Partial<BrandLookupResult> = {}): BrandLookupResult {
  return {
    query: "acme.com",
    detectedTargetType: "domain",
    resolvedTarget: "acme.com",
    fetchedAt: "2026-09-06T00:00:00.000Z",
    mode: "live",
    hasData: true,
    totalMentions: 12,
    totalAiSearchVolume: 100,
    perPlatform: [
      { platform: "chat_gpt", status: "success", mentions: 7, aiSearchVolume: 40 },
      { platform: "google", status: "success", mentions: 5, aiSearchVolume: 60 },
    ],
    shareOfVoice: {
      platforms: ["chat_gpt", "google"],
      entries: [
        { label: "acme.com", isTarget: true, mentions: 12, sharePct: 60 },
        { label: "rival.com", isTarget: false, mentions: 8, sharePct: 40 },
      ],
    },
    costEstimateUsd: 0.4,
    ...overrides,
  };
}

describe("liveVisibilitySnapshotsFromLookup", () => {
  it("maps successful platforms to chatgpt/gemini live rows", () => {
    const rows = liveVisibilitySnapshotsFromLookup(baseResult());
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      prompt: LIVE_PROMPT,
      engine: "chatgpt",
      cited: true,
      source: "live",
      competitorsMentioned: ["rival.com"],
    });
    expect(rows[1]?.engine).toBe("gemini");
    expect(rows[0]?.responseSnippet).toContain("SoV 60%");
  });

  it("skips errored platforms and zero-mention is not cited", () => {
    const rows = liveVisibilitySnapshotsFromLookup(
      baseResult({
        totalMentions: 0,
        perPlatform: [
          { platform: "chat_gpt", status: "error", mentions: 0, aiSearchVolume: 0, error: "fail" },
          { platform: "google", status: "success", mentions: 0, aiSearchVolume: 0 },
        ],
        shareOfVoice: null,
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ engine: "gemini", cited: false, competitorsMentioned: [] });
  });
});

describe("brandLookupQuery", () => {
  it("prefers hostname from URL", () => {
    expect(brandLookupQuery("https://www.acme.com/path", "Acme")).toBe("acme.com");
  });

  it("falls back to brand name when URL is invalid", () => {
    expect(brandLookupQuery("not a url", "Acme")).toBe("Acme");
  });
});
