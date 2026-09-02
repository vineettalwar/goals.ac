import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { getOrCreateSession, recordAnswer } from "@/lib/onboarding/session-service";
import { ingestBrandVoiceDocuments } from "@workspace/content-engine/brand/brand-voice-indexer";

const Body = z.object({
  samples: z.array(z.string().trim().min(1)).min(1).max(20),
});

/**
 * The LinkedIn OAuth fallback: the firm pastes a few of their own posts instead of
 * connecting an account. Ingests them as a brand voice source the same way a
 * successful OAuth sync would, just sourced from paste rather than the API.
 */
export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const session = await getOrCreateSession(userId!);
  if (!session.websiteProjectId) {
    return NextResponse.json(
      { error: "Website not set up yet. Answer the website question first." },
      { status: 400 },
    );
  }

  const { samples } = parsed.data;
  await ingestBrandVoiceDocuments(session.websiteProjectId, [
    {
      sourceType: "social_linkedin",
      sourceUrl: `linkedin:paste:${userId}`,
      title: "Pasted LinkedIn posts",
      text: samples.join("\n\n---\n\n"),
      metadata: { postCount: samples.length },
      replaceExisting: true,
    },
  ]);

  const { session: updated } = await recordAnswer(
    userId!,
    "linkedin",
    { mode: "paste", postCount: samples.length },
    "done",
  );

  return NextResponse.json({ postCount: samples.length, session: updated });
}
