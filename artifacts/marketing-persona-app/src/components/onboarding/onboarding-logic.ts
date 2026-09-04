/**
 * Framework-free logic for the Typeform shell: step ordering, progress counting,
 * and keyboard-to-action mapping. Kept free of React/DOM so it can be unit tested
 * directly (the repo's vitest setup runs in a Node environment with no DOM, see
 * vitest.config.ts at the repo root, and there is no @testing-library/react installed
 * anywhere in the monorepo, so component-render tests are not possible here today).
 */
import { ONBOARDING_STEPS, type OnboardingStepDef, type OnboardingStepContext } from "./onboarding-contract";
import type { OnboardingStepId, OnboardingStepStatus } from "@workspace/db/schema/onboarding_sessions";

const NON_RENDERING = new Set<OnboardingStepId>(["done"]);

/**
 * The frozen, progress-bar-visible step list. Computed once from the step
 * statuses present the moment a session is first loaded. Freezing it at load
 * time (rather than recomputing live) is what keeps "question N of M" from
 * jumping later when the user skips a connect step of their own accord. Only
 * skips that already existed before the user ever saw a question (i.e. from
 * invite prefill, or a conditional step's `shouldAsk` reporting false) are
 * excluded from the count.
 *
 * `context` mirrors what the server's `resolveNextStep` used to decide the
 * session's `currentStep` at load time (see the `styleSufficiency` the session
 * route now returns): a step whose `shouldAsk` reports false for it is dropped
 * from the count exactly like one already marked "skipped", so the style
 * questionnaire never inflates "question N of M" for a firm that will never see
 * it. Omitted, it defaults to "nothing known", the same conditional steps
 * `resolveNextStep` itself treats as not-yet-decided, so the two never disagree.
 */
export function computeVisibleStepIds(
  stepStatusAtLoad: OnboardingStepStatus,
  steps: OnboardingStepDef[] = ONBOARDING_STEPS,
  context: OnboardingStepContext = {}
): OnboardingStepId[] {
  return steps
    .filter((s) => !s.shouldAsk || s.shouldAsk(context))
    .map((s) => s.id)
    .filter((id) => !NON_RENDERING.has(id))
    .filter((id) => stepStatusAtLoad[id] !== "skipped");
}

/** 1-indexed position of `currentStep` within the frozen visible list, clamped. */
export function positionOf(visibleStepIds: OnboardingStepId[], currentStep: OnboardingStepId): number {
  const idx = visibleStepIds.indexOf(currentStep);
  if (idx === -1) return visibleStepIds.length;
  return idx + 1;
}

export function totalQuestions(visibleStepIds: OnboardingStepId[]): number {
  return visibleStepIds.length;
}

/** Index of a step within the full registry order (used for back-navigation bounds). */
export function stepIndex(id: OnboardingStepId, steps: OnboardingStepDef[] = ONBOARDING_STEPS): number {
  return steps.findIndex((s) => s.id === id);
}

export function nextStepId(
  currentId: OnboardingStepId,
  steps: OnboardingStepDef[] = ONBOARDING_STEPS
): OnboardingStepId | null {
  const idx = stepIndex(currentId, steps);
  if (idx === -1 || idx + 1 >= steps.length) return null;
  return steps[idx + 1].id;
}

export function prevAnsweredStepId(
  currentId: OnboardingStepId,
  visibleStepIds: OnboardingStepId[]
): OnboardingStepId | null {
  const idx = visibleStepIds.indexOf(currentId);
  if (idx <= 0) return null;
  return visibleStepIds[idx - 1];
}

/** Keyboard actions the shell dispatches, independent of any DOM event object. */
export type KeyAction =
  | { type: "submit" }
  | { type: "newline" }
  | { type: "select"; index: number }
  | { type: "move"; direction: "up" | "down" }
  | { type: "back" }
  | { type: "noop" };

export type KeyContext = {
  key: string;
  shiftKey: boolean;
  /** Textareas want Shift+Enter to insert a newline instead of submitting. */
  isMultiline: boolean;
  /** Only `choice` screens honor number-key and arrow-key selection. */
  isChoiceLike: boolean;
  choiceCount: number;
};

/** Pure translation of a keypress into a shell action. This is what "Enter submits,
 * Shift+Enter newlines, digits pick a choice, Escape never loses work" reduces to. */
export function resolveKeyAction(ctx: KeyContext): KeyAction {
  if (ctx.key === "Enter") {
    if (ctx.isMultiline && ctx.shiftKey) return { type: "newline" };
    return { type: "submit" };
  }
  if (ctx.key === "Escape") return { type: "noop" };
  if (ctx.isChoiceLike) {
    if (ctx.key === "ArrowDown") return { type: "move", direction: "down" };
    if (ctx.key === "ArrowUp") return { type: "move", direction: "up" };
    if (/^[1-9]$/.test(ctx.key)) {
      const index = Number(ctx.key) - 1;
      if (index < ctx.choiceCount) return { type: "select", index };
    }
  }
  return { type: "noop" };
}

/** A connect step is "resolved" once it has any mode at all, including a skip. */
export function isConnectResolved(status: OnboardingStepStatus[OnboardingStepId]): boolean {
  return status === "done" || status === "skipped";
}

/** Decide which widget the LinkedIn step should show given the API's own answer. */
export function linkedinModeFromResponse(
  response: { fallback?: "paste" } | { connected: true; postCount?: number }
): "paste" | "connected" {
  return "fallback" in response && response.fallback === "paste" ? "paste" : "connected";
}
