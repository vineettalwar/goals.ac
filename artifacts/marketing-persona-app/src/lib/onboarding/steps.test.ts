import { describe, expect, it } from "vitest";
import { ONBOARDING_STEP_IDS, type OnboardingAnswers, type OnboardingStepStatus } from "@workspace/db/schema";
import { ONBOARDING_STEPS, getStepDefinition, resolveNextStep } from "./steps";

describe("ONBOARDING_STEPS", () => {
  it("covers every schema-declared step id, in the schema's order", () => {
    expect(ONBOARDING_STEPS.map((s) => s.id)).toEqual([...ONBOARDING_STEP_IDS]);
  });

  it("marks only the PRD-required steps as required", () => {
    const required = ONBOARDING_STEPS.filter((s) => s.required).map((s) => s.id);
    expect(required).toEqual(expect.arrayContaining(["firm_name", "vertical", "website"]));
  });

  it("marks the PRD-skippable connect/competitor steps as not required", () => {
    for (const id of ["linkedin", "search_console", "wordpress", "competitors"] as const) {
      expect(getStepDefinition(id).required).toBe(false);
    }
  });
});

describe("resolveNextStep", () => {
  it("starts at firm_name with no answers", () => {
    expect(resolveNextStep({}, {})).toBe("firm_name");
  });

  it("auto-advances past a step satisfied by invite prefill without it ever being marked done", () => {
    const answers: OnboardingAnswers = { orgName: "Acme Law", vertical: "law" };
    // Neither step has an explicit stepStatus entry — prefill alone satisfies isSatisfied.
    expect(resolveNextStep(answers, {})).toBe("website");
  });

  it("does not advance past a required step with no answer", () => {
    const answers: OnboardingAnswers = { orgName: "Acme Law" };
    expect(resolveNextStep(answers, {})).toBe("vertical");
  });

  it("advances past a skippable step once explicitly marked skipped, even with no answer", () => {
    const answers: OnboardingAnswers = {
      orgName: "Acme Law",
      vertical: "law",
      websiteUrl: "https://acmelaw.example",
      goal: "leads",
      audience: "People who need a lawyer",
    };
    const stepStatus: OnboardingStepStatus = { competitors: "skipped" };
    expect(resolveNextStep(answers, stepStatus)).toBe("linkedin");
  });

  it("does not advance a skippable step until it is answered or explicitly skipped", () => {
    const answers: OnboardingAnswers = {
      orgName: "Acme Law",
      vertical: "law",
      websiteUrl: "https://acmelaw.example",
      goal: "leads",
      audience: "People who need a lawyer",
    };
    expect(resolveNextStep(answers, {})).toBe("competitors");
  });

  describe("the style questionnaire fallback (shouldAsk)", () => {
    const answersThroughWordpress: OnboardingAnswers = {
      orgName: "Acme Law",
      vertical: "law",
      websiteUrl: "https://acmelaw.example",
      goal: "leads",
      audience: "People who need a lawyer",
    };
    const stepStatusThroughWordpress: OnboardingStepStatus = {
      competitors: "skipped",
      linkedin: "skipped",
      search_console: "skipped",
      wordpress: "skipped",
    };

    it("skips all three style steps when the scan was sufficient", () => {
      const next = resolveNextStep(answersThroughWordpress, stepStatusThroughWordpress, {
        styleSufficiency: { sufficient: true },
      });
      expect(next).toBe("voice_review");
    });

    it("asks all three style steps in order when the scan was insufficient", () => {
      const context = { styleSufficiency: { sufficient: false } };
      expect(resolveNextStep(answersThroughWordpress, stepStatusThroughWordpress, context)).toBe(
        "style_pitch",
      );

      const afterPitch = { ...answersThroughWordpress, stylePitch: "We fight for tenants." };
      expect(resolveNextStep(afterPitch, stepStatusThroughWordpress, context)).toBe("style_rivals");

      const afterRivals = { ...afterPitch, styleRivals: ["https://rival.example"] };
      expect(resolveNextStep(afterRivals, stepStatusThroughWordpress, context)).toBe("style_jargon");

      const afterJargon = { ...afterRivals, styleJargon: "Love: tenant | Never: landlord-friendly" };
      expect(resolveNextStep(afterJargon, stepStatusThroughWordpress, context)).toBe("voice_review");
    });

    it("does not drag the firm backwards when the verdict lands after they have moved on", () => {
      // The scan starts at `website` and finishes whenever it finishes. A firm
      // that reached the last question before the verdict arrived must not be
      // thrown back to question ten.
      const atTheEnd: OnboardingStepStatus = {
        ...stepStatusThroughWordpress,
        voice_review: "done",
        topics: "done",
      };

      expect(
        resolveNextStep(answersThroughWordpress, atTheEnd, { styleSufficiency: { sufficient: false } }),
      ).toBe("done");
    });

    it("still asks when the verdict arrives while the firm is standing on an earlier step", () => {
      // The guard above must not swallow the questionnaire entirely: nothing
      // past the style steps has been answered here, so they are still ahead.
      expect(
        resolveNextStep(answersThroughWordpress, stepStatusThroughWordpress, {
          styleSufficiency: { sufficient: false },
        }),
      ).toBe("style_pitch");
    });

    it("lets a firm skip every style question", () => {
      // These exist because the site told us little. Hard-blocking a firm we
      // already know little about is exactly backwards.
      for (const id of ["style_pitch", "style_rivals", "style_jargon"] as const) {
        expect(getStepDefinition(id).required).toBe(false);
      }
    });

    it("does not ask, and does not block, when sufficiency has not been recorded yet", () => {
      // No context passed at all -- the scan may still be running, or the firm
      // skipped past `website`. Either way the flow must keep moving.
      expect(resolveNextStep(answersThroughWordpress, stepStatusThroughWordpress)).toBe("voice_review");
      // Same result passing an explicit context with no signal on it.
      expect(
        resolveNextStep(answersThroughWordpress, stepStatusThroughWordpress, { styleSufficiency: null }),
      ).toBe("voice_review");
    });
  });

  it("stays on done once every prior step is satisfied or resolved", () => {
    const answers: OnboardingAnswers = {
      orgName: "Acme Law",
      vertical: "law",
      websiteUrl: "https://acmelaw.example",
      goal: "leads",
      audience: "People who need a lawyer",
      topicIds: [1],
    };
    const stepStatus: OnboardingStepStatus = {
      competitors: "skipped",
      linkedin: "skipped",
      search_console: "skipped",
      wordpress: "skipped",
      voice_review: "done",
    };
    expect(resolveNextStep(answers, stepStatus)).toBe("done");
  });
});
