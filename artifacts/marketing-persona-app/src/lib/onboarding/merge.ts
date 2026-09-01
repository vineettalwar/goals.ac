import type { OnboardingAnswers, OnboardingStepId, OnboardingStepState, OnboardingStepStatus } from "@workspace/db/schema";

/**
 * Pure per-key merge of an answers patch into the current document. Never
 * assign `patch` wholesale over `current` — that is exactly the whole-doc
 * clobber the PRD calls out (two tabs advancing the same session must not erase
 * each other's steps). Last write wins per key, which is the behavior the PRD
 * explicitly accepts.
 *
 * Kept dependency-free (no db/org imports) so it can be unit tested without
 * pulling in the rest of the onboarding stack.
 */
export function mergeAnswers(
  current: OnboardingAnswers,
  patch: Partial<OnboardingAnswers>,
): OnboardingAnswers {
  return { ...current, ...patch };
}

export function mergeStepStatus(
  current: OnboardingStepStatus,
  step: OnboardingStepId,
  state: OnboardingStepState,
): OnboardingStepStatus {
  return { ...current, [step]: state };
}
