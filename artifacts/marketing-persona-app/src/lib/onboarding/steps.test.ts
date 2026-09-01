import { describe, expect, it } from "vitest";
import { ONBOARDING_STEP_IDS, type OnboardingAnswers, type OnboardingStepStatus } from "@workspace/db/schema";
import { ONBOARDING_STEPS, resolveNextStep, getStepDefinition } from "./steps";

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
