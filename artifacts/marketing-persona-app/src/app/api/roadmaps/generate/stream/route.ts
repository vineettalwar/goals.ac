import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  generateProjectRoadmapSlug,
  generateRoadmapStream,
  generateSlug,
} from "@/lib/ai/roadmap-generator";
import { loadRoadmapProjectContext } from "@workspace/content-engine/support/content/roadmap-project-context";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  pinRoadmapToProject,
  verifyProjectOwnership,
} from "@/lib/projects/pin-roadmap-to-project";
import {
  billingDeniedResponse,
  cancelAiBilling,
  completeAiBilling,
  prepareAiBilling,
} from "@/lib/billing/ai-billing";
import { z } from "zod";

const sseHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

const AUTH_REQUIRED_MESSAGE =
  "Sign in to generate a custom roadmap. Browse our free catalog for existing roadmaps.";

const GenerateRoadmapBody = z.object({
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
  projectId: z.number().int().positive().optional(),
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

  const slug =
    validatedProjectId != null
      ? generateProjectRoadmapSlug(industry, location, stage, validatedProjectId)
      : generateSlug(industry, location, stage);

  async function maybePin(roadmapId: number) {
    if (validatedProjectId != null) {
      await pinRoadmapToProject(validatedProjectId, roadmapId);
      return true;
    }
    return false;
  }

  if (validatedProjectId == null) {
    const existing = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      const roadmap = existing[0]!;
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ event: "cached", ...roadmap, pinned: false })}\n\n`,
            ),
          );
          controller.close();
        },
      });
      return new Response(stream, { headers: sseHeaders });
    }

    return new Response(
      JSON.stringify({ error: "auth_required", message: AUTH_REQUIRED_MESSAGE }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const existingProjectRoadmap = await db
    .select()
    .from(roadmapsTable)
    .where(eq(roadmapsTable.slug, slug))
    .limit(1);

  if (existingProjectRoadmap.length > 0) {
    const roadmap = existingProjectRoadmap[0]!;
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

  const usesByok = Boolean(userAiSettings?.userApiKey);
  const billingPrep = await prepareAiBilling({
    userId: authenticatedUserId!,
    tier: "planning",
    quotaKind: "roadmap",
    usedByok: usesByok,
  });
  if (!billingPrep.ok) {
    return billingDeniedResponse(billingPrep);
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
          const projectContext = await loadRoadmapProjectContext(
            validatedProjectId!,
            authenticatedUserId ?? undefined,
          );
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
              projectContext ?? undefined,
            );
          } catch {
            await cancelAiBilling(billingPrep.ctx, "generation_failed");
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
            await completeAiBilling(billingPrep.ctx, {
              userId: authenticatedUserId,
              eventType: "roadmap_generation",
              usedByok: billingPrep.usedByok,
              tier: "planning",
            });
          } else if (!inserted) {
            await cancelAiBilling(billingPrep.ctx, "race_conflict");
          }

          send("done", { ...finalRoadmap, pinned });
          controller.close();
        } catch {
          await cancelAiBilling(billingPrep.ctx, "stream_error");
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
