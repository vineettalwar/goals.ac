import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateRoadmap, generateSlug } from "@/lib/ai/roadmap-generator";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { requireAuth } from "@/lib/auth/require-auth";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { z } from "zod";

const AUTH_REQUIRED_MESSAGE =
  "Sign in to generate a custom roadmap. Browse our free catalog for existing roadmaps.";

const GenerateRoadmapBody = z.object({
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
});

export async function POST(req: Request) {
  const limited = await rateLimitResponse(
    `ai-gen:ip:${getClientIp(req)}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = GenerateRoadmapBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request: " + parsed.error.message }, { status: 400 });
  }

  const { industry, location, stage } = parsed.data;

  try {
    const slug = generateSlug(industry, location, stage);

    const existing = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(existing[0]);
    }

    const { userId, error } = await requireAuth();
    if (error) {
      return NextResponse.json(
        { error: "auth_required", message: AUTH_REQUIRED_MESSAGE },
        { status: 401 },
      );
    }

    const [userAiSettings, billingPrep] = await Promise.all([
      loadUserAiSettings(userId!),
      prepareAiBilling({
      userId: userId!,
      tier: "planning",
      quotaKind: "roadmap",
    }),  ]);
    if (!billingPrep.ok) return billingPrep.response;

    let content;
    try {
      content = await generateRoadmap(
        industry,
        location,
        stage,
        userAiSettings.userApiKey ?? undefined,
        userAiSettings.aiProviderOptions,
      );
    } catch {
      await cancelAiBilling(billingPrep.ctx, "generation_failed");
      return NextResponse.json(
        { error: "Roadmap generation temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }

    const [inserted] = await db
      .insert(roadmapsTable)
      .values({ slug, industry, location, stage, content })
      .onConflictDoNothing({ target: roadmapsTable.slug })
      .returning();

    if (inserted) {
      await completeAiBilling(billingPrep.ctx, {
        userId: userId!,
        eventType: "roadmap_generation",
        usedByok: billingPrep.usedByok,
        tier: "planning",
      });
      return NextResponse.json(inserted);
    }

    await cancelAiBilling(billingPrep.ctx, "race_conflict");

    const [race] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    return NextResponse.json(race);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
