import { describe, expect, it } from "vitest";
import type { OnboardingAnswers } from "@workspace/db/schema";
import { applyStyleAnswersToBrandProfile, parseJargonAnswer } from "./style-answers";

const EMPTY_BRAND_FIELDS = {
  voiceTone: "",
  competitorUrls: [] as string[],
  doWords: [] as string[],
  dontWords: [] as string[],
  antiPatterns: [] as string[],
};

describe("parseJargonAnswer", () => {
  it("splits labelled halves on the pipe", () => {
    expect(parseJargonAnswer("Love: fiduciary, counsel | Never: boilerplate, turnkey")).toEqual({
      doWords: ["fiduciary", "counsel"],
      dontWords: ["boilerplate", "turnkey"],
      styleNote: "",
    });
  });

  it("is case-insensitive on the labels and tolerant of extra whitespace", () => {
    expect(parseJargonAnswer("  love:  tenant  |  never:  landlord-friendly  ")).toEqual({
      doWords: ["tenant"],
      dontWords: ["landlord-friendly"],
      styleNote: "",
    });
  });

  it("reads the same lists written across separate lines", () => {
    expect(parseJargonAnswer("We love: counsel\nWe avoid: synergy, turnkey")).toEqual({
      doWords: ["counsel"],
      dontWords: ["synergy", "turnkey"],
      styleNote: "",
    });
  });

  it("keeps an unlabelled sentence out of the word lists", () => {
    // These lists reach the generator as vocabulary. A sentence parsed as a
    // preferred word would come back out inside an article.
    expect(parseJargonAnswer("We sound like lawyers, not like a startup")).toEqual({
      doWords: [],
      dontWords: [],
      styleNote: "We sound like lawyers, not like a startup",
    });
  });

  it("drops prose from a labelled list but keeps the real terms", () => {
    const result = parseJargonAnswer(
      "love: counsel, anything that sounds like it came from a marketing department",
    );
    expect(result.doWords).toEqual(["counsel"]);
  });

  it("never throws on empty input", () => {
    expect(parseJargonAnswer("")).toEqual({ doWords: [], dontWords: [], styleNote: "" });
  });
});

describe("applyStyleAnswersToBrandProfile", () => {
  it("is a no-op when the firm skipped the questionnaire entirely", () => {
    const existing = {
      voiceTone: "Warm and direct.",
      competitorUrls: ["https://scan-found-this.example"],
      doWords: ["counsel"],
      dontWords: ["boilerplate"],
      antiPatterns: ["Never open with a rhetorical question"],
    };
    expect(applyStyleAnswersToBrandProfile({}, existing)).toEqual(existing);
  });

  it("seeds voiceTone from stylePitch when there is nothing from the scan yet", () => {
    const answers: OnboardingAnswers = { stylePitch: "We fight for tenants." };
    const result = applyStyleAnswersToBrandProfile(answers, EMPTY_BRAND_FIELDS);
    expect(result.voiceTone).toBe("We fight for tenants.");
  });

  it("extends, never replaces, an existing non-empty voiceTone", () => {
    const answers: OnboardingAnswers = { stylePitch: "We fight for tenants." };
    const result = applyStyleAnswersToBrandProfile(answers, {
      ...EMPTY_BRAND_FIELDS,
      voiceTone: "Warm and direct.",
    });
    expect(result.voiceTone).toBe("Warm and direct.\n\nWe fight for tenants.");
  });

  it("joins styleRivals into competitorUrls without dropping what the scan already found", () => {
    const answers: OnboardingAnswers = { styleRivals: ["https://rival.example"] };
    const result = applyStyleAnswersToBrandProfile(answers, {
      ...EMPTY_BRAND_FIELDS,
      competitorUrls: ["https://scan-found-this.example"],
    });
    expect(result.competitorUrls).toEqual([
      "https://scan-found-this.example",
      "https://rival.example",
    ]);
  });

  it("de-duplicates when styleRivals repeats a competitor the scan already found", () => {
    const answers: OnboardingAnswers = { styleRivals: ["https://scan-found-this.example"] };
    const result = applyStyleAnswersToBrandProfile(answers, {
      ...EMPTY_BRAND_FIELDS,
      competitorUrls: ["https://scan-found-this.example"],
    });
    expect(result.competitorUrls).toEqual(["https://scan-found-this.example"]);
  });

  it("splits styleJargon into doWords and dontWords, and folds the forbidden half into antiPatterns", () => {
    const answers: OnboardingAnswers = { styleJargon: "Love: tenant | Never: landlord-friendly" };
    const result = applyStyleAnswersToBrandProfile(answers, EMPTY_BRAND_FIELDS);
    expect(result.doWords).toEqual(["tenant"]);
    expect(result.dontWords).toEqual(["landlord-friendly"]);
    expect(result.antiPatterns).toEqual(['Never use the word "landlord-friendly"']);
  });

  it("merges onto whatever the scan's doWords/dontWords/antiPatterns already had", () => {
    const answers: OnboardingAnswers = { styleJargon: "Love: tenant | Never: landlord-friendly" };
    const result = applyStyleAnswersToBrandProfile(answers, {
      ...EMPTY_BRAND_FIELDS,
      doWords: ["counsel"],
      dontWords: ["boilerplate"],
      antiPatterns: ["Never open with a rhetorical question"],
    });
    expect(result.doWords).toEqual(["counsel", "tenant"]);
    expect(result.dontWords).toEqual(["boilerplate", "landlord-friendly"]);
    expect(result.antiPatterns).toEqual([
      "Never open with a rhetorical question",
      'Never use the word "landlord-friendly"',
    ]);
  });

  it("applies all three answers together", () => {
    const answers: OnboardingAnswers = {
      stylePitch: "We fight for tenants.",
      styleRivals: ["https://rival.example"],
      styleJargon: "Love: tenant | Never: landlord-friendly",
    };
    const result = applyStyleAnswersToBrandProfile(answers, EMPTY_BRAND_FIELDS);
    expect(result).toEqual({
      voiceTone: "We fight for tenants.",
      competitorUrls: ["https://rival.example"],
      doWords: ["tenant"],
      dontWords: ["landlord-friendly"],
      antiPatterns: ['Never use the word "landlord-friendly"'],
    });
  });
});
