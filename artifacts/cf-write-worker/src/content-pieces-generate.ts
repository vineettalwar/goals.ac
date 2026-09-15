import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { db } from "./db";
import {
  CONTENT_FORMAT_TYPES,
  contentPiecesTable,
  type ContentPieceMetadata,
} from "@workspace/db/schema-sqlite";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAccessibleProject } from "./project-access";
import {
  GENERATABLE_STATUSES,
  assertAiGenerationReady,
  type TrackJob,
} from "./content-pieces-shared";

export async function handleContentPieceGenerate(
  request: Request,
  contentPieceId: number,
  userId: number,
  trackJob?: TrackJob,
): Promise<Response> {
  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const aiReady = await assertAiGenerationReady(userId);
  if (!aiReady.ok) {
    return withCors(request, Response.json({ error: aiReady.message }, { status: 503 }));
  }

  const rawBody = (await request.json().catch(() => null)) as {
    agentFastMode?: boolean;
  } | null;
  const agentFastMode = rawBody?.agentFastMode === true;

  const [piece] = await db
    .select({
      id: contentPiecesTable.id,
      websiteProjectId: contentPiecesTable.websiteProjectId,
      status: contentPiecesTable.status,
    })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, contentPieceId))
    .limit(1);

  if (!piece) {
    return withCors(request, Response.json({ error: "Content piece not found" }, { status: 404 }));
  }

  const project = await getAccessibleProject(piece.websiteProjectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  if (!GENERATABLE_STATUSES.has(piece.status)) {
    return withCors(
      request,
      Response.json({ error: "Content piece cannot be generated in its current status" }, { status: 400 }),
    );
  }

  const queuePayload = {
    contentPieceId,
    projectId: piece.websiteProjectId,
    userId,
    generateVariants: false,
    ...(agentFastMode ? { agentFastMode: true as const } : {}),
  };

  const jobId = await sendToCfQueue(QUEUES.contentGenerate, queuePayload);
  const id = jobId ?? `cf:${QUEUES.contentGenerate}:${Date.now()}`;

  if (trackJob) {
    await trackJob(id, QUEUES.contentGenerate, {
      userId,
      projectId: piece.websiteProjectId,
      contentPieceId,
    });
  }

  await db
    .update(contentPiecesTable)
    .set({ status: "generating" })
    .where(eq(contentPiecesTable.id, contentPieceId));

  return withCors(request, acceptedJobResponse(id, QUEUES.contentGenerate, { contentPieceId }));
}

export async function handleDailyFiveWrite(
  request: Request,
  projectId: number,
  userId: number,
  trackJob?: TrackJob,
): Promise<Response> {
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const aiReady = await assertAiGenerationReady(userId);
  if (!aiReady.ok) {
    return withCors(request, Response.json({ error: aiReady.message }, { status: 503 }));
  }

  const dailyFiveBody = z.object({
    items: z
      .array(
        z.object({
          formatType: z.enum(CONTENT_FORMAT_TYPES).optional().default("blog_post"),
          targetKeyword: z.string().trim().min(1),
          angleHint: z.string().optional(),
          cmsCategories: z.array(z.string().trim().min(1)).max(20).optional(),
          useAgentTeam: z.boolean().optional(),
          agentFastMode: z.boolean().optional(),
        }),
      )
      .min(1)
      .max(5),
  });

  const parsed = dailyFiveBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
  }

  const created: unknown[] = [];
  const jobIds: string[] = [];
  const failures: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < parsed.data.items.length; i += 1) {
    const item = parsed.data.items[i]!;
    try {
      const metadata: ContentPieceMetadata = {
        ...(item.angleHint ? { contentAngle: item.angleHint } : {}),
        ...(item.cmsCategories?.length ? { cmsCategories: item.cmsCategories } : {}),
      };
      const [piece] = await db
        .insert(contentPiecesTable)
        .values({
          websiteProjectId: projectId,
          title: item.targetKeyword,
          targetKeyword: item.targetKeyword,
          formatType: item.formatType,
          status: "generating",
          bodyMarkdown: "",
          wordCount: 0,
          pieceMetadata: Object.keys(metadata).length > 0 ? metadata : null,
        })
        .returning();
      if (!piece) throw new Error("Failed to create draft");

      const jobId = await sendToCfQueue(QUEUES.contentGenerate, {
        contentPieceId: piece.id,
        projectId,
        userId,
        generateVariants: false,
        ...(item.agentFastMode ? { agentFastMode: true as const } : {}),
      });
      const id = jobId ?? `cf:${QUEUES.contentGenerate}:${crypto.randomUUID()}`;
      if (trackJob) {
        await trackJob(id, QUEUES.contentGenerate, {
          userId,
          projectId,
          contentPieceId: piece.id,
        });
      }
      created.push(piece);
      jobIds.push(id);
    } catch (err) {
      failures.push({
        index: i,
        error: err instanceof Error ? err.message : "Generation failed",
      });
    }
  }

  return withCors(
    request,
    Response.json(
      {
        ok: failures.length === 0,
        created,
        jobIds,
        failures,
      },
      { status: jobIds.length > 0 ? 202 : 400 },
    ),
  );
}
