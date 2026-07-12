import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { roadmapsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateRoadmap, generateSlug } from "@/lib/ai/roadmap-generator";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/require-auth";
import {
  getMonthlyRoadmapCountForUser,
  getRoadmapQuota,
  recordUsage,
} from "@/lib/usage";
import { z } from "zod";

const AUTH_REQUIRED_MESSAGE =
  "Sign in to generate a custom roadmap. Browse our free catalog for existing roadmaps.";

const GenerateRoadmapBody = z.object({
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
});

export async function POST(req: Request) {
  const limited = rateLimitResponse(
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

    const [owner] = await db
      .select({ plan: usersTable.plan, encryptedGeminiKey: usersTable.encryptedGeminiKey })
      .from(usersTable)
      .where(eq(usersTable.id, userId!))
      .limit(1);

    const usesByok = Boolean(owner?.encryptedGeminiKey);
    if (!usesByok) {
      const quota = getRoadmapQuota(owner?.plan);
      if (quota !== null) {
        const roadmapsThisMonth = await getMonthlyRoadmapCountForUser(userId!);
        if (roadmapsThisMonth >= quota) {
          return NextResponse.json(
            {
              error: "quota_exhausted",
              message: `You've used all ${quota} roadmap generations included in your ${owner?.plan ?? "starter"} plan this month. Upgrade your plan or add your own Gemini API key for unlimited generations.`,
              plan: owner?.plan ?? "starter",
              quota,
              roadmapsThisMonth,
            },
            { status: 402 },
          );
        }
      }
    }

    let content;
    try {
      content = await generateRoadmap(industry, location, stage);
    } catch {
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
      await recordUsage({
        userId: userId!,
        eventType: "roadmap_generation",
        usedByok: usesByok,
      });
      return NextResponse.json(inserted);
    }

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
