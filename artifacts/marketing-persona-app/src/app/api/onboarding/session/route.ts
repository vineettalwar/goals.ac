import { NextResponse } from "next/server";
import { z } from "zod";
import { ONBOARDING_STEP_IDS } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { getOrCreateSession, recordAnswer, OnboardingConcurrentWriteError } from "@/lib/onboarding/session-service";
import { InvalidOnboardingAnswerError } from "@/lib/onboarding/answer-schema";
import { loadStyleSufficiencyContext } from "@/lib/onboarding/style-context";

/**
 * GET  -> { session, styleSufficiency }, creating the active session on first call.
 * PATCH { step, answer?, status? } -> { session, nextStep, styleSufficiency }
 *
 * `styleSufficiency` is the same signal `resolveNextStep` branches the style
 * questionnaire steps on (see `lib/onboarding/steps.ts`), handed to the client so
 * its progress count can agree with what the server will and won't ask.
 */
export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const session = await getOrCreateSession(userId!);
  const { styleSufficiency } = await loadStyleSufficiencyContext(session.websiteProjectId);
  return NextResponse.json({ session, styleSufficiency: styleSufficiency ?? null });
}

const PatchBody = z.object({
  step: z.enum(ONBOARDING_STEP_IDS as unknown as [string, ...string[]]),
  answer: z.unknown().optional(),
  status: z.enum(["pending", "skipped", "done", "failed"]).optional(),
});

export async function PATCH(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { step, answer, status } = parsed.data;

  try {
    const { session, nextStep, styleSufficiency } = await recordAnswer(
      userId!,
      step as (typeof ONBOARDING_STEP_IDS)[number],
      answer,
      status,
    );
    return NextResponse.json({ session, nextStep, styleSufficiency: styleSufficiency ?? null });
  } catch (err) {
    if (err instanceof InvalidOnboardingAnswerError) {
      return NextResponse.json(
        { error: "Invalid answer", step: err.step, issues: err.issues },
        { status: 400 },
      );
    }
    if (err instanceof OnboardingConcurrentWriteError) {
      return NextResponse.json(
        { error: "That saved somewhere else a moment ago. Try again." },
        { status: 409 },
      );
    }
    throw err;
  }
}
