import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getOrCreateSession, recordAnswer } from "@/lib/onboarding/session-service";
import { syncSocialHistoryForPlatform } from "@workspace/content-engine/social/social-history-sync-service";

/**
 * Attempts the existing LinkedIn history ingest for the onboarding voice step.
 * `/v2/ugcPosts?q=authors` needs `r_member_social`, which LinkedIn grants only to
 * approved partner apps — a 403 is the expected case for most customers, not an
 * error, so this route never dead-ends the flow on one. Any failure (403 or
 * otherwise — no LinkedIn account connected, a transient API error) resolves the
 * same way: `{ fallback: 'paste' }`.
 */
export async function POST() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const session = await getOrCreateSession(userId!);
  if (!session.websiteProjectId) {
    return NextResponse.json(
      { error: "Website not set up yet. Answer the website question first." },
      { status: 400 },
    );
  }

  const result = await syncSocialHistoryForPlatform(session.websiteProjectId, userId!, "linkedin");

  if (result.error || result.postCount === 0) {
    return NextResponse.json({ fallback: "paste", reason: result.error ?? "No LinkedIn posts found" });
  }

  await recordAnswer(userId!, "linkedin", { mode: "oauth", postCount: result.postCount }, "done");

  return NextResponse.json({
    connected: true,
    postCount: result.postCount,
    brandVoiceIngested: result.brandVoiceIngested,
  });
}
