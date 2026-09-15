import { describe, expect, it } from "vitest";
import {
  emptyResearchEvidence,
  mergeResearchEvidence,
  NO_RESEARCH_DATA_NOTE,
  researchFromSourceUrls,
  researchPromptBlock,
  sanitizeFerretResearch,
  sourceUrlsFromAngleHint,
} from "./research-evidence";

describe("sourceUrlsFromAngleHint", () => {
  it("pulls URLs from the Daily Five sources tag", () => {
    expect(
      sourceUrlsFromAngleHint("section:News|notes|sources: https://example.com/a, https://example.com/b"),
    ).toEqual(["https://example.com/a", "https://example.com/b"]);
  });
});

describe("sanitizeFerretResearch", () => {
  it("never marks fabricated sources verified when nothing is connected", () => {
    const sanitized = sanitizeFerretResearch(
      {
        keyFacts: [{ fact: "Made-up stat", source: "https://invented.example", verified: true }],
        statistics: [{ stat: "99%", source: "A blog", year: 2024 }],
      },
      emptyResearchEvidence(),
    );

    expect(sanitized.note).toBe(NO_RESEARCH_DATA_NOTE);
    expect(sanitized.researchConnected).toBe(false);
    expect((sanitized.keyFacts as Array<{ verified: boolean }>)[0]?.verified).toBe(false);
    expect((sanitized.statistics as Array<{ verified: boolean }>)[0]?.verified).toBe(false);
  });

  it("keeps verified only when the source matches grounded evidence", () => {
    const evidence = researchFromSourceUrls(["https://example.com/report"]);
    const sanitized = sanitizeFerretResearch(
      {
        keyFacts: [
          { fact: "From the report", source: "https://example.com/report", verified: true },
          { fact: "Invented", source: "https://nope.example", verified: true },
        ],
      },
      evidence,
    );
    const facts = sanitized.keyFacts as Array<{ fact: string; verified: boolean }>;
    expect(facts[0]?.verified).toBe(true);
    expect(facts[1]?.verified).toBe(false);
    expect(sanitized.researchConnected).toBe(true);
  });
});

describe("researchPromptBlock", () => {
  it("tells the model not to fabricate verified facts", () => {
    expect(researchPromptBlock(emptyResearchEvidence())).toContain(NO_RESEARCH_DATA_NOTE);
    expect(researchPromptBlock(emptyResearchEvidence())).toMatch(/must NOT set verified: true/i);
  });
});

describe("mergeResearchEvidence", () => {
  it("is connected when any part has facts", () => {
    const merged = mergeResearchEvidence(emptyResearchEvidence(), researchFromSourceUrls(["https://a.example"]));
    expect(merged.connected).toBe(true);
    expect(merged.sources.map((s) => s.id)).toContain("editor_urls");
  });
});
