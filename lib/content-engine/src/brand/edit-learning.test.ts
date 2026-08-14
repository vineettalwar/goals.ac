import { describe, expect, it } from "vitest";
import { buildEditVoiceDocument, shouldLearnFromEdit, summarizeEdit } from "./edit-learning";

/** Long enough to clear the minimum-length guard. */
function pad(text: string): string {
  return `${text} ${"filler sentence for length. ".repeat(12)}`;
}

describe("summarizeEdit", () => {
  it("reports no change for identical text", () => {
    expect(summarizeEdit("the same words", "the same words").changedRatio).toBe(0);
  });

  it("reports a total change when nothing is shared", () => {
    expect(summarizeEdit("alpha beta", "gamma delta").changedRatio).toBe(1);
  });

  it("ignores case and punctuation", () => {
    expect(summarizeEdit("Hello, world!", "hello world").changedRatio).toBe(0);
  });

  it("lists words the founder added", () => {
    const summary = summarizeEdit("we provide solutions", "we provide plumbing");

    expect(summary.addedWords).toContain("plumbing");
    expect(summary.addedWords).not.toContain("provide");
  });

  it("lists words the founder removed", () => {
    const summary = summarizeEdit("we leverage synergies", "we use teamwork");

    expect(summary.removedWords).toEqual(expect.arrayContaining(["leverage", "synergies"]));
  });

  it("orders words by how often they changed", () => {
    const summary = summarizeEdit("a a a b", "x x x x x y");

    expect(summary.removedWords[0]).toBe("a");
    expect(summary.addedWords[0]).toBe("x");
  });

  it("counts repeated words rather than treating text as a set", () => {
    expect(summarizeEdit("go go go go", "go").changedRatio).toBeGreaterThan(0);
  });

  it("handles empty input without dividing by zero", () => {
    expect(summarizeEdit("", "").changedRatio).toBe(0);
  });

  it("is deterministic for the same edit", () => {
    const a = summarizeEdit("one two three four", "one two five six");
    const b = summarizeEdit("one two three four", "one two five six");

    expect(a).toEqual(b);
  });
});

describe("shouldLearnFromEdit", () => {
  it("learns from a substantial rewrite", () => {
    expect(shouldLearnFromEdit(pad("we leverage synergies"), pad("we just do the work"))).toBe(true);
  });

  it("ignores a typo fix", () => {
    const original = pad("our maintenance plan covers backups");
    const edited = original.replace("covers", "cover");

    expect(shouldLearnFromEdit(original, edited)).toBe(false);
  });

  it("ignores an edit too short to show a voice", () => {
    expect(shouldLearnFromEdit("original text here", "totally different")).toBe(false);
  });

  it("ignores content with no original to compare against", () => {
    expect(shouldLearnFromEdit("", pad("brand new text"))).toBe(false);
  });

  it("respects custom thresholds", () => {
    const original = pad("our maintenance plan covers backups");
    const edited = original.replace("covers", "cover");

    expect(shouldLearnFromEdit(original, edited, { minChangedRatio: 0.001 })).toBe(true);
  });
});

describe("buildEditVoiceDocument", () => {
  const input = {
    contentPieceId: 42,
    title: "WordPress Maintenance Plans",
    original: pad("we leverage cutting-edge synergies to elevate outcomes"),
    edited: pad("we keep your site running and fix things when they break"),
  };

  it("stores the edited version, not the original", () => {
    const doc = buildEditVoiceDocument(input)!;

    expect(doc.text).toContain("fix things when they break");
    expect(doc.text).not.toContain("synergies");
  });

  it("tags the source so it is distinguishable from scraped content", () => {
    expect(buildEditVoiceDocument(input)!.sourceType).toBe("user_edit");
  });

  it("keys the source to the piece so repeat edits replace rather than stack", () => {
    const doc = buildEditVoiceDocument(input)!;

    expect(doc.sourceUrl).toBe("piece://42");
    expect(doc.replaceExisting).toBe(true);
  });

  it("records removed words as anti-pattern candidates", () => {
    const doc = buildEditVoiceDocument(input)!;

    expect(doc.metadata!.removedWords).toEqual(expect.arrayContaining(["synergies"]));
  });

  it("weights a hand-corrected draft above scraped pages", () => {
    expect(buildEditVoiceDocument(input)!.metadata!.weight).toBe(2);
  });

  it("returns null for an edit not worth learning from", () => {
    expect(
      buildEditVoiceDocument({ ...input, edited: input.original }),
    ).toBeNull();
  });
});
