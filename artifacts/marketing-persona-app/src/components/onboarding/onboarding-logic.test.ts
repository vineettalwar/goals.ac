import { describe, expect, it } from "vitest";
import {
  computeVisibleStepIds,
  positionOf,
  totalQuestions,
  nextStepId,
  prevAnsweredStepId,
  resolveKeyAction,
  isConnectResolved,
  linkedinModeFromResponse,
} from "./onboarding-logic";
import { ONBOARDING_STEPS } from "./onboarding-contract";
import type { OnboardingStepStatus } from "@workspace/db/schema/onboarding_sessions";

describe("onboarding-logic: resuming mid-flow", () => {
  it("jumps straight to the session's current_step with a stable question count", () => {
    // Session as it would come back from GET /api/onboarding/session after the
    // user answered the first five questions and closed the tab.
    const stepStatus: OnboardingStepStatus = {
      firm_name: "done",
      vertical: "done",
      website: "done",
      goal: "done",
      audience: "done",
      competitors: "pending",
    };
    const visible = computeVisibleStepIds(stepStatus);

    // "done" steps are counted (they already happened), only the terminal
    // screen and the style questionnaire fallback are excluded: the latter
    // because no context was passed, which reads as "sufficiency not recorded",
    // the same as resolveNextStep treats it server-side.
    expect(visible).toContain("firm_name");
    expect(visible).not.toContain("done");
    expect(visible).not.toContain("style_pitch");
    expect(totalQuestions(visible)).toBe(ONBOARDING_STEPS.length - 1 - 3);

    // Resuming at question 6 (competitors) reports position 6, not 1.
    expect(positionOf(visible, "competitors")).toBe(6);
  });

  it("does not count prefill-skipped steps in the total, so the count never jumps later", () => {
    // Admin invite prefilled firm name and vertical, so those steps never render
    // and are skipped before the user answers anything.
    const stepStatus: OnboardingStepStatus = {
      firm_name: "skipped",
      vertical: "skipped",
    };
    const visible = computeVisibleStepIds(stepStatus);
    expect(visible).not.toContain("firm_name");
    expect(visible).not.toContain("vertical");
    expect(totalQuestions(visible)).toBe(ONBOARDING_STEPS.length - 1 - 2 - 3);

    // The user's first real question is "website" and it reports position 1.
    expect(positionOf(visible, "website")).toBe(1);
  });

  it("keeps a step skipped by the user's own choice mid-flow inside the frozen count", () => {
    // Snapshot taken at load: linkedin still pending, nothing skipped yet.
    const atLoad: OnboardingStepStatus = { firm_name: "done", vertical: "done", linkedin: "pending" };
    const visible = computeVisibleStepIds(atLoad);
    const totalAtLoad = totalQuestions(visible);

    // The user later clicks Skip on LinkedIn; that must not shrink the total,
    // it only advances the current step past it.
    expect(visible).toContain("linkedin");
    expect(totalQuestions(visible)).toBe(totalAtLoad);
  });
});

describe("onboarding-logic: the style questionnaire fallback in the visible count", () => {
  it("counts all three style steps when the scan came back insufficient", () => {
    const visible = computeVisibleStepIds({}, ONBOARDING_STEPS, { styleSufficiency: { sufficient: false } });
    expect(visible).toContain("style_pitch");
    expect(visible).toContain("style_rivals");
    expect(visible).toContain("style_jargon");
    expect(totalQuestions(visible)).toBe(ONBOARDING_STEPS.length - 1);
  });

  it("excludes all three when the scan was sufficient", () => {
    const visible = computeVisibleStepIds({}, ONBOARDING_STEPS, { styleSufficiency: { sufficient: true } });
    expect(visible).not.toContain("style_pitch");
    expect(visible).not.toContain("style_rivals");
    expect(visible).not.toContain("style_jargon");
    expect(totalQuestions(visible)).toBe(ONBOARDING_STEPS.length - 1 - 3);
  });

  it("excludes all three when sufficiency has not been recorded, with no context passed at all", () => {
    const visible = computeVisibleStepIds({});
    expect(visible).not.toContain("style_pitch");
    expect(totalQuestions(visible)).toBe(ONBOARDING_STEPS.length - 1 - 3);
  });
});

describe("onboarding-logic: connect steps are always skippable", () => {
  it("treats a skipped connect step as resolved and advances the registry order", () => {
    expect(isConnectResolved("skipped")).toBe(true);
    expect(isConnectResolved("done")).toBe(true);
    expect(isConnectResolved("pending")).toBe(false);
    expect(isConnectResolved(undefined)).toBe(false);

    // linkedin -> search_console -> wordpress in the fixed step order, so
    // skipping linkedin must land on search_console next.
    expect(nextStepId("linkedin")).toBe("search_console");
    expect(nextStepId("search_console")).toBe("wordpress");
  });

  it("lets the user go back to an already-answered step to edit it", () => {
    const visible = computeVisibleStepIds({ firm_name: "done", vertical: "done", website: "pending" });
    expect(prevAnsweredStepId("website", visible)).toBe("vertical");
    expect(prevAnsweredStepId("firm_name", visible)).toBeNull();
  });
});

describe("onboarding-logic: LinkedIn paste fallback", () => {
  it("renders the paste widget when the API reports the OAuth fallback", () => {
    expect(linkedinModeFromResponse({ fallback: "paste" })).toBe("paste");
  });

  it("renders the connected state when OAuth actually succeeded", () => {
    expect(linkedinModeFromResponse({ connected: true, postCount: 12 })).toBe("connected");
    expect(linkedinModeFromResponse({ connected: true })).toBe("connected");
  });
});

describe("onboarding-logic: keyboard handling", () => {
  it("Enter submits a single-line question", () => {
    const action = resolveKeyAction({
      key: "Enter",
      shiftKey: false,
      isMultiline: false,
      isChoiceLike: false,
      choiceCount: 0,
    });
    expect(action).toEqual({ type: "submit" });
  });

  it("Shift+Enter inserts a newline instead of submitting, only in a textarea", () => {
    const action = resolveKeyAction({
      key: "Enter",
      shiftKey: true,
      isMultiline: true,
      isChoiceLike: false,
      choiceCount: 0,
    });
    expect(action).toEqual({ type: "newline" });
  });

  it("Enter still submits a multiline question when shift is not held", () => {
    const action = resolveKeyAction({
      key: "Enter",
      shiftKey: false,
      isMultiline: true,
      isChoiceLike: false,
      choiceCount: 0,
    });
    expect(action).toEqual({ type: "submit" });
  });

  it("number keys select a choice option, Typeform-style", () => {
    const action = resolveKeyAction({
      key: "2",
      shiftKey: false,
      isMultiline: false,
      isChoiceLike: true,
      choiceCount: 5,
    });
    expect(action).toEqual({ type: "select", index: 1 });
  });

  it("ignores a number key beyond the available choices", () => {
    const action = resolveKeyAction({
      key: "9",
      shiftKey: false,
      isMultiline: false,
      isChoiceLike: true,
      choiceCount: 3,
    });
    expect(action).toEqual({ type: "noop" });
  });

  it("Escape never loses work: it is always a no-op", () => {
    expect(
      resolveKeyAction({ key: "Escape", shiftKey: false, isMultiline: true, isChoiceLike: false, choiceCount: 0 })
    ).toEqual({ type: "noop" });
  });
});
