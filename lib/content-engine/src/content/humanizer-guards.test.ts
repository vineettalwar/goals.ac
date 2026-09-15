import { describe, expect, it } from "vitest";
import { countAiSlopSignals } from "./ai-writing-rules";
import {
  passesHumanizeQualityGate,
  passesHumanizeStructureGuards,
  recoverHumanizeWhenUnchanged,
} from "./humanizer";

const BASE = `## Intro

Concrete tip: ship the checklist before the blog post.
See the [study](https://example.com/study) for numbers.

## FAQ

### What is this?
A short answer with specifics.

### Why bother?
Because generic drafts waste review time.
`;

describe("passesHumanizeStructureGuards", () => {
  it("accepts rewrite that keeps headings, links, FAQ, and citations", () => {
    const rewritten = BASE.replace("Concrete tip:", "Do this:");
    const result = passesHumanizeStructureGuards(BASE, rewritten, [
      "https://example.com/study",
    ]);
    expect(result).toEqual({ ok: true });
  });

  it("rejects when an H2 disappears", () => {
    const rewritten = BASE.replace("## FAQ\n\n", "");
    const result = passesHumanizeStructureGuards(BASE, rewritten);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/FAQ|H2|heading/);
  });

  it("rejects when a body link URL is dropped", () => {
    const rewritten = BASE.replace("[study](https://example.com/study)", "study");
    const result = passesHumanizeStructureGuards(BASE, rewritten);
    expect(result).toEqual({ ok: false, reason: "link guard" });
  });

  it("rejects when a citation URL is missing from the rewrite", () => {
    const rewritten = BASE.replace("[study](https://example.com/study)", "study");
    const result = passesHumanizeStructureGuards(BASE, rewritten, [
      "https://example.com/study",
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(["link guard", "citation guard"]).toContain(result.reason);
  });

  it("rejects when FAQ question count drops", () => {
    const rewritten = BASE.replace(
      "### Why bother?\nBecause generic drafts waste review time.\n",
      "",
    );
    const result = passesHumanizeStructureGuards(BASE, rewritten);
    expect(result).toEqual({ ok: false, reason: "FAQ guard" });
  });
});

describe("passesHumanizeQualityGate", () => {
  it("rejects when slop does not improve", () => {
    const body =
      "In today's fast-paced world, it is important to note that synergy unlocks growth.";
    const result = passesHumanizeQualityGate(body, body, 3, 3);
    expect(result).toEqual({ ok: false, reason: "no slop improvement" });
  });

  it("accepts when slop drops and body stays readable", () => {
    const before =
      "In today's fast-paced world, leverage synergy to unlock unprecedented growth.";
    const after =
      "Ship one checklist this week. Measure opens, then cut the fluff you never needed.";
    const result = passesHumanizeQualityGate(before, after, 4, 0);
    expect(result).toEqual({ ok: true });
  });

  it("keeps a rewrite that cut slop even if Human voice is still under the floor", () => {
    const before = "In today's fast-paced world, leverage synergy.";
    const after = "Ship the checklist this week.";
    const result = passesHumanizeQualityGate(before, after, 3, 0);
    expect(result).toEqual({ ok: true });
  });

  it("does not force an extra humanize pass over a single moderate corporate verb", () => {
    // A realistic multi-paragraph draft with one ordinary "optimize" reads as clean prose,
    // not an AI tell. countAiSlopSignals should score it 0, so the gate never demands an
    // improvement that was never needed.
    const paragraph =
      "Our team shipped the new checklist last week after three rounds of user testing with real customers. " +
      "The support queue dropped by half within four days, and onboarding time fell from twelve minutes to five. ";
    const draft = `We want to optimize onboarding this quarter. ${paragraph.repeat(30)}`;
    expect(countAiSlopSignals(draft)).toBe(0);
    const result = passesHumanizeQualityGate(draft, draft, 0, 0);
    expect(result).toEqual({ ok: true });
  });
});

describe("recoverHumanizeWhenUnchanged", () => {
  it("marks a clean draft as humanized so the checklist can pass", () => {
    const body = "Ship the checklist this week. Measure opens, then cut the fluff.";
    expect(countAiSlopSignals(body)).toBe(0);
    const recovered = recoverHumanizeWhenUnchanged(body);
    expect(recovered.humanized).toBe(true);
    expect(recovered.body).toBe(body);
  });

  it("applies deterministic slop strip when the model rewrite was discarded", () => {
    const body = "Ship the checklist — then measure opens with real customers.";
    expect(countAiSlopSignals(body)).toBeGreaterThan(0);
    const recovered = recoverHumanizeWhenUnchanged(body, {
      slopScoreBefore: countAiSlopSignals(body),
      slopScoreAfter: countAiSlopSignals(body),
      humanizationLevel: "light",
      rejected: true,
      reason: "heading guard",
    });
    expect(recovered.humanized).toBe(true);
    expect(recovered.body).not.toContain("—");
    expect(recovered.audit?.rejected).toBeFalsy();
  });
});
