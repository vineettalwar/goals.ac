import { describe, expect, it } from "vitest";
import { parseBrandVoiceDraft } from "./brand-voice-skill";

describe("parseBrandVoiceDraft", () => {
  it("reads a JSON draft", () => {
    const draft = parseBrandVoiceDraft(
      JSON.stringify({
        skill: "## Voice Summary\nDirect and specific.",
        typicalStructure: "Hook → Problem → Proof → CTA",
        brandGlossary: ["goals.ac", "GEO"],
        antiPatterns: ["synergy"],
        doWords: ["specific", "plain"],
        dontWords: ["leverage"],
        voiceTone: "Calm expert, short sentences.",
      }),
    );

    expect(draft?.skill).toContain("Voice Summary");
    expect(draft?.typicalStructure).toBe("Hook → Problem → Proof → CTA");
    expect(draft?.brandGlossary).toEqual(["goals.ac", "GEO"]);
    expect(draft?.dontWords).toEqual(["leverage"]);
  });

  it("accepts fenced JSON", () => {
    const draft = parseBrandVoiceDraft('```json\n{"skill":"# Voice"}\n```');
    expect(draft?.skill).toBe("# Voice");
  });

  it("returns null when skill is missing", () => {
    expect(parseBrandVoiceDraft('{"typicalStructure":"Hook"}')).toBeNull();
  });

  it("drops blank and duplicate terms", () => {
    const draft = parseBrandVoiceDraft(
      JSON.stringify({
        skill: "ok",
        brandGlossary: ["A", "A", " ", "B"],
      }),
    );
    expect(draft?.brandGlossary).toEqual(["A", "B"]);
  });
});
