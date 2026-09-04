import { describe, expect, it } from "vitest";
import {
  computeStyleVector,
  describeStyleVector,
  isEmptyStyleVector,
  type StyleVector,
} from "./style-vector";

const TECHNICAL_DOC = {
  title: "API Authentication",
  text: `
Authentication requires a signed request header containing a rotating credential.
The server validates the signature against the registered public key before processing.
Requests missing a valid signature are rejected with a 401 status code.
Rate limiting is enforced per organization using a sliding window algorithm.
Configuration parameters are documented in the reference specification.
Implementations should handle credential expiration gracefully by refreshing tokens proactively.
Idempotency keys prevent duplicate processing when a client retries a failed request.

- Rotate credentials every ninety days.
- Store secrets in an encrypted vault.
- Monitor authentication failure rates continuously.
`,
};

const CHATTY_DOC = {
  title: "Why We Started",
  text: `
Hey! We're so glad you're here.

We built this because we were tired of clunky tools that made our team feel dumb. Have you ever felt that way too?

You deserve software that just works. We don't want you to struggle. We've got your back!

It's simple. It's fast. It's fun.

Our team loves feedback, so tell us what you think!
`,
};

function firstDocVector(): StyleVector {
  return computeStyleVector([TECHNICAL_DOC]);
}

function secondDocVector(): StyleVector {
  return computeStyleVector([CHATTY_DOC]);
}

describe("computeStyleVector", () => {
  it("returns an all-zero vector for an empty or whitespace-only corpus", () => {
    for (const docs of [[], [{ text: "" }], [{ text: "   \n\n  " }], [{ text: "\t" }, { text: "" }]]) {
      const vector = computeStyleVector(docs);
      expect(vector.sampleWordCount).toBe(0);
      expect(vector.sampleDocumentCount).toBe(0);
      expect(vector.vocabularyTier).toBe("plain");
      expect(isEmptyStyleVector(vector)).toBe(true);

      for (const [key, value] of Object.entries(vector)) {
        if (key === "vocabularyTier" || key === "computedAt") continue;
        expect(Number.isNaN(value as number)).toBe(false);
        expect(value).toBe(0);
      }
    }
  });

  it("is not empty for a real corpus", () => {
    expect(isEmptyStyleVector(firstDocVector())).toBe(false);
  });

  it("separates a terse technical page from a chatty first-person page", () => {
    const technical = firstDocVector();
    const chatty = secondDocVector();

    // The chatty sample uses far more first/second person address.
    expect(chatty.firstPersonRatio).toBeGreaterThan(technical.firstPersonRatio);
    expect(chatty.secondPersonRatio).toBeGreaterThan(technical.secondPersonRatio);

    // The chatty sample leans on contractions and exclamation points; the
    // technical sample almost never does.
    expect(chatty.contractionRatio).toBeGreaterThan(technical.contractionRatio);
    expect(chatty.exclamationRatio).toBeGreaterThan(technical.exclamationRatio);

    // The technical sample reads at a higher grade level with a heavier
    // vocabulary and longer average sentences.
    expect(technical.readingGradeLevel).toBeGreaterThan(chatty.readingGradeLevel);
    expect(technical.avgSentenceWords).toBeGreaterThan(chatty.avgSentenceWords);
    expect(technical.avgWordLength).toBeGreaterThan(chatty.avgWordLength);

    // The chatty sample is easier to read.
    expect(chatty.fleschReadingEase).toBeGreaterThan(technical.fleschReadingEase);
  });

  it("detects list usage in a document with bullet lines", () => {
    const vector = firstDocVector();
    expect(vector.listUsageRatio).toBeGreaterThan(0);
  });

  it("counts sentences ending in a question mark or exclamation point", () => {
    const vector = secondDocVector();
    expect(vector.questionRatio).toBeGreaterThan(0);
    expect(vector.exclamationRatio).toBeGreaterThan(0);
  });

  it("gives every word at least one syllable and treats a trailing silent e as mute", () => {
    // "code" is one syllable (trailing e dropped); "table" is two ("le" kept).
    const vector = computeStyleVector([{ text: "The code is short. The table is long." }]);
    expect(vector.sampleWordCount).toBeGreaterThan(0);
    expect(Number.isNaN(vector.fleschReadingEase)).toBe(false);
    expect(Number.isNaN(vector.readingGradeLevel)).toBe(false);
  });

  it("classifies vocabulary tier from grade level and complex word ratio", () => {
    const plain = computeStyleVector([
      { text: "We win. We ship fast. You get paid. It just works. We are done." },
    ]);
    expect(plain.vocabularyTier).toBe("plain");

    const technical = computeStyleVector([TECHNICAL_DOC]);
    expect(["professional", "technical"]).toContain(technical.vocabularyTier);
  });

  it("never emits NaN across a mixed batch of usable and empty documents", () => {
    const vector = computeStyleVector([
      TECHNICAL_DOC,
      { text: "" },
      { text: "   " },
      CHATTY_DOC,
    ]);
    for (const value of Object.values(vector)) {
      if (typeof value === "number") {
        expect(Number.isNaN(value)).toBe(false);
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });
});

describe("describeStyleVector", () => {
  it("returns an empty string for an empty vector", () => {
    const vector = computeStyleVector([]);
    expect(describeStyleVector(vector)).toBe("");
  });

  it("renders concrete, numeric prompt lines rather than a data dump", () => {
    const description = describeStyleVector(firstDocVector());
    expect(description).toContain("Average sentence:");
    expect(description).toContain("words");
    expect(description).not.toContain("—");
    expect(description.split("\n").length).toBeGreaterThanOrEqual(5);
  });

  it("reflects measured differences between contrasting samples", () => {
    const technicalDescription = describeStyleVector(firstDocVector());
    const chattyDescription = describeStyleVector(secondDocVector());
    expect(technicalDescription).not.toEqual(chattyDescription);
  });
});

describe("readability bounds and partial vectors", () => {
  it("keeps reading grade and ease inside their defined ranges for text the formulas were not built for", () => {
    // No whitespace to count words by, which drove grade to -15.2 and ease
    // to 205.8 before the clamp. Those values reach a generation prompt.
    const v = computeStyleVector([{ text: "私たちは住宅所有者を支援します。ベルリンを拠点としています。" }]);
    expect(v.readingGradeLevel).toBeGreaterThanOrEqual(1);
    expect(v.readingGradeLevel).toBeLessThanOrEqual(18);
    expect(v.fleschReadingEase).toBeGreaterThanOrEqual(0);
    expect(v.fleschReadingEase).toBeLessThanOrEqual(100);
  });

  it("renders a partially written vector without leaking undefined or NaN into the prompt", () => {
    // Vectors come back off a jsonb column, so a row written by an older or
    // interrupted scan can be missing fields entirely.
    const partial = {
      sampleWordCount: 500,
      sampleDocumentCount: 3,
      vocabularyTier: "plain",
    } as unknown as StyleVector;

    const described = describeStyleVector(partial);
    expect(described).not.toContain("undefined");
    expect(described).not.toContain("NaN");
  });
});
