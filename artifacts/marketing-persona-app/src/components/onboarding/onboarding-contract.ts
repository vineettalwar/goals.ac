/**
 * The onboarding step registry, re-exported for the UI.
 *
 * `@/lib/onboarding/steps` is the single source of truth: the session route uses the
 * same definitions to decide the next step, so the screen the firm sees and the step
 * the server thinks they are on cannot drift apart. This file exists only so the
 * component tree has one local import path for them.
 */
export type {
  OnboardingAnswers,
  OnboardingStepId,
  OnboardingStepStatus,
  OnboardingGoal,
} from "@workspace/db/schema/onboarding_sessions";
export type { OrgVertical } from "@workspace/db/schema/org_invites";

export {
  ONBOARDING_STEPS,
  getStepDefinition,
  getStepDefinition as getStepDef,
  resolveNextStep,
  type OnboardingStepOption,
  type OnboardingStepOption as OnboardingChoiceOption,
  type OnboardingStepDefinition,
  type OnboardingStepDefinition as OnboardingStepDef,
} from "@/lib/onboarding/steps";
