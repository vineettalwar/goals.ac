import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { completeSession, OnboardingIncompleteError } from "@/lib/onboarding/complete-session";
import { logger } from "@/lib/utils/logger";

/**
 * POST -> { projectId, contentItemId }
 *
 * `contentItemId` is null when first-article dispatch failed (job enqueue error,
 * no topic to generate from) — onboarding still completes, and the response also
 * carries `generationDispatched` / `generationError` so the completion screen can
 * offer a retry instead of showing a silent empty dashboard.
 */
export async function POST() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const result = await completeSession(userId!);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OnboardingIncompleteError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    logger.error({ err, userId }, "Onboarding completion failed");
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}
