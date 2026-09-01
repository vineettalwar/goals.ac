import { describe, expect, it } from "vitest";
import type { OnboardingAnswers } from "@workspace/db/schema";
import { mergeAnswers, mergeStepStatus } from "./merge";
import { validateStepAnswer, InvalidOnboardingAnswerError } from "./answer-schema";

describe("mergeAnswers", () => {
  it("merges a patch in without touching unrelated keys", () => {
    const current: OnboardingAnswers = { orgName: "Acme Law", vertical: "law" };
    const patch: Partial<OnboardingAnswers> = { websiteUrl: "https://acmelaw.example" };
    expect(mergeAnswers(current, patch)).toEqual({
      orgName: "Acme Law",
      vertical: "law",
      websiteUrl: "https://acmelaw.example",
    });
  });

  it("does not clobber a concurrent write to a different key (two-tab race)", () => {
    // Tab A read the session, then tab B wrote `audience` before tab A's write lands.
    const baseline: OnboardingAnswers = { orgName: "Acme Law" };
    const tabBResult = mergeAnswers(baseline, { audience: "Small business owners" });
    // Tab A's write is applied on top of tab B's persisted result (this is what
    // recordAnswer does: read-current-then-merge, not overwrite-whole-document).
    const tabAResult = mergeAnswers(tabBResult, { vertical: "law" });

    expect(tabAResult).toEqual({
      orgName: "Acme Law",
      audience: "Small business owners",
      vertical: "law",
    });
  });

  it("last write wins when both tabs touch the same key, per PRD", () => {
    const baseline: OnboardingAnswers = { orgName: "Acme Law" };
    const afterTabB = mergeAnswers(baseline, { orgName: "Acme Legal" });
    expect(afterTabB.orgName).toBe("Acme Legal");
  });
});

describe("mergeStepStatus", () => {
  it("sets only the given step's status, leaving others untouched", () => {
    const current = { firm_name: "done" as const };
    expect(mergeStepStatus(current, "vertical", "done")).toEqual({
      firm_name: "done",
      vertical: "done",
    });
  });
});

describe("validateStepAnswer", () => {
  it("accepts a valid answer and maps it to the right OnboardingAnswers key", () => {
    expect(validateStepAnswer("firm_name", "Acme Law")).toEqual({ orgName: "Acme Law" });
    expect(validateStepAnswer("vertical", "law")).toEqual({ vertical: "law" });
  });

  it("normalizes a bare domain into a full URL for url-shaped answers", () => {
    expect(validateStepAnswer("website", "acmelaw.example")).toEqual({
      websiteUrl: "https://acmelaw.example",
    });
  });

  it("rejects a malformed answer", () => {
    expect(() => validateStepAnswer("vertical", "not-a-real-vertical")).toThrow(
      InvalidOnboardingAnswerError,
    );
    expect(() => validateStepAnswer("firm_name", "")).toThrow(InvalidOnboardingAnswerError);
    expect(() => validateStepAnswer("topics", [])).toThrow(InvalidOnboardingAnswerError);
    expect(() => validateStepAnswer("linkedin", { mode: "not-a-mode" })).toThrow(
      InvalidOnboardingAnswerError,
    );
  });

  it("returns an empty patch for steps with no answer field (review, terminal)", () => {
    expect(validateStepAnswer("voice_review", { anything: true })).toEqual({});
    expect(validateStepAnswer("done", undefined)).toEqual({});
  });
});
