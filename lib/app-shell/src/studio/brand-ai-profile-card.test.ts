/**
 * Run: pnpm exec vitest run lib/app-shell/src/studio/brand-ai-profile-card.test.ts
 */
import { describe, expect, it } from "vitest";
import { brandVoiceHubFacts, type BrandProfileSummary } from "./brand-ai-profile-card";

describe("brandVoiceHubFacts", () => {
  it("surfaces scan facts and traits, not the generated summary", () => {
    const profile: BrandProfileSummary = {
      scrapeStatus: "complete",
      pageCount: 12,
      voiceTone: "Technical Tip provides in-depth, hands-on technical tutorials.",
      primaryKeywords: ["WordPress setup", "Amazon S3"],
      discoveryMeta: { sitemap: true, homepage: true, sitemapUrlCount: 12 },
      brandMemory: {
        summary: "Technical Tip provides in-depth, hands-on technical tutorials focused on cloud infrastructure.",
        voiceTraits: ["educational", "hands-on", "direct"],
        confidence: { summary: "high" },
        scanSources: ["https://example.com/a", "https://example.com/b"],
        lastScannedAt: "2026-09-15T00:00:00.000Z",
      },
    };

    const facts = brandVoiceHubFacts(profile);
    const blob = JSON.stringify(facts);
    expect(blob).not.toContain("in-depth");
    expect(blob).not.toContain("provides");
    expect(blob).not.toContain("WordPress setup");
    expect(facts.traits).toEqual(["educational", "hands-on", "direct"]);
    expect(facts.metaBits.some((bit) => bit.includes("sitemap"))).toBe(true);
    expect(facts.metaBits.some((bit) => bit.includes("high confidence"))).toBe(true);
  });
});
