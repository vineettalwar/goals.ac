import { db } from "@workspace/db";
import { roadmapsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateRoadmapStream, generateSlug } from "@/lib/ai/roadmap-generator";
import { loadUserAiSettings } from "@/lib/content-pieces-helpers";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/require-auth";
import {
  pinRoadmapToProject,
  verifyProjectOwnership,
} from "@/lib/pin-roadmap-to-project";
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
  projectId: z.number().int().positive().optional(),
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
    return new Response(
      JSON.stringify({ error: "Invalid request: " + parsed.error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { industry, location, stage, projectId } = parsed.data;

  let validatedProjectId: number | null = null;
  let authenticatedUserId: number | null = null;
  let userAiSettings: Awaited<ReturnType<typeof loadUserAiSettings>> | null = null;
  if (projectId != null) {
    const { userId, error } = await requireAuth();
    if (error) return error;

    authenticatedUserId = userId!;
    userAiSettings = await loadUserAiSettings(userId!);

    const project = await verifyProjectOwnership(projectId, userId!);
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    validatedProjectId = projectId;
  }

  const sseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };

  const slug = generateSlug(industry, location, stage);

  async function maybePin(roadmapId: number) {
    if (validatedProjectId != null) {
      await pinRoadmapToProject(validatedProjectId, roadmapId);
      return true;
    }
    return false;
  }

  const existing = await db
    .select()
    .from(roadmapsTable)
    .where(eq(roadmapsTable.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    const roadmap = existing[0]!;
    const pinned = await maybePin(roadmap.id);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ event: "cached", ...roadmap, pinned })}\n\n`,
          ),
        );
        controller.close();
      },
    });
    return new Response(stream, { headers: sseHeaders });
  }

  if (validatedProjectId == null) {
    return new Response(
      JSON.stringify({ error: "auth_required", message: AUTH_REQUIRED_MESSAGE }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const usesByok = Boolean(userAiSettings?.userApiKey);
  if (!usesByok && authenticatedUserId != null) {
    const [owner] = await db
      .select({ plan: usersTable.plan })
      .from(usersTable)
      .where(eq(usersTable.id, authenticatedUserId))
      .limit(1);

    const quota = getRoadmapQuota(owner?.plan);
    if (quota !== null) {
      const roadmapsThisMonth = await getMonthlyRoadmapCountForUser(authenticatedUserId);
      if (roadmapsThisMonth >= quota) {
        return new Response(
          JSON.stringify({
            error: "quota_exhausted",
            message: `You've used all ${quota} roadmap generations included in your ${owner?.plan ?? "starter"} plan this month. Upgrade your plan or add your own Gemini API key for unlimited generations.`,
            plan: owner?.plan ?? "starter",
            quota,
            roadmapsThisMonth,
          }),
          { status: 402, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  }

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        function send(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ event, ...(data as object) })}\n\n`),
          );
        }

        try {
          let content;
          try {
            content = await generateRoadmapStream(
              industry,
              location,
              stage,
              (event, data) => {
                send(event, data as object);
              },
              userAiSettings?.userApiKey,
              userAiSettings?.aiProviderOptions,
            );
          } catch {
            send("error", {
              error: "Roadmap generation temporarily unavailable. Please try again shortly.",
            });
            controller.close();
            return;
          }

          const [inserted] = await db
            .insert(roadmapsTable)
            .values({ slug, industry, location, stage, content })
            .onConflictDoNothing({ target: roadmapsTable.slug })
            .returning();

          const finalRoadmap =
            inserted ??
            (await db.select().from(roadmapsTable).where(eq(roadmapsTable.slug, slug)).limit(1))[0];

          const pinned = finalRoadmap ? await maybePin(finalRoadmap.id) : false;

          if (inserted && authenticatedUserId != null) {
            await recordUsage({
              userId: authenticatedUserId,
              eventType: "roadmap_generation",
              usedByok: usesByok,
            });
          }

          send("done", { ...finalRoadmap, pinned });
          controller.close();
        } catch {
          try {
            const encoder2 = new TextEncoder();
            controller.enqueue(
              encoder2.encode(
                `data: ${JSON.stringify({ event: "error", error: "Internal server error" })}\n\n`,
              ),
            );
          } catch {
            /* closed */
          }
          controller.close();
        }
      },
    }),
    { headers: sseHeaders },
  );
}
