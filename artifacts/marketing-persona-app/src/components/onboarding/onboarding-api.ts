/**
 * Thin fetch client for the onboarding session API, built strictly against the
 * contract in docs/prd/production-firm-onboarding.md ("API contract"). The routes
 * themselves are owned by a parallel stream; this file does not implement them.
 */
import type {
  OnboardingAnswers,
  OnboardingStepId,
  OnboardingStepStatus,
} from "@workspace/db/schema/onboarding_sessions";

export type OnboardingSessionDTO = {
  id: number;
  organizationId: number | null;
  companyId: number | null;
  websiteProjectId: number | null;
  vertical: string | null;
  currentStep: OnboardingStepId;
  answers: OnboardingAnswers;
  stepStatus: OnboardingStepStatus;
  completedAt: string | null;
};

export class OnboardingApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "OnboardingApiError";
  }
}

async function parseOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new OnboardingApiError(body?.error ?? fallbackMessage, res.status);
  }
  return res.json() as Promise<T>;
}

export async function getSession(): Promise<{ session: OnboardingSessionDTO | null }> {
  const res = await fetch("/api/onboarding/session", { method: "GET" });
  return parseOrThrow(res, "Could not load your onboarding session.");
}

export async function patchSession(input: {
  step: OnboardingStepId;
  answer?: unknown;
  status?: "pending" | "skipped" | "done" | "failed";
}): Promise<{ session: OnboardingSessionDTO; nextStep: OnboardingStepId }> {
  const res = await fetch("/api/onboarding/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow(res, "Could not save that answer.");
}

export async function completeSession(): Promise<{ projectId: number; contentItemId: number }> {
  const res = await fetch("/api/onboarding/session/complete", { method: "POST" });
  return parseOrThrow(res, "Could not start your first article.");
}

export type LinkedinIngestResult =
  | { fallback: "paste" }
  | { connected: true; postCount?: number };

export async function connectLinkedin(): Promise<LinkedinIngestResult> {
  const res = await fetch("/api/onboarding/voice/linkedin", { method: "POST" });
  return parseOrThrow(res, "Could not reach LinkedIn.");
}

export async function pasteLinkedinSamples(samples: string[]): Promise<{ postCount: number }> {
  const res = await fetch("/api/onboarding/voice/paste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ samples }),
  });
  return parseOrThrow(res, "Could not save those posts.");
}
