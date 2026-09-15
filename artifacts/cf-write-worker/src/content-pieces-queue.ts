import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { assessPublishReadiness } from "@workspace/content-engine/content/publish-readiness";
import { buildPublishReadinessOptions } from "@workspace/content-engine/support/publishing/readiness-options";
import { contentPiecesTable } from "@workspace/db/schema-sqlite";
import { db } from "./db";
import { getAccessibleProject } from "./project-access";

const contentGenerateBody = z
  .object({
    contentItemId: z.number().int().positive().optional(),
    contentPieceId: z.number().int().positive().optional(),
    projectId: z.number().int().positive(),
    generateVariants: z.boolean().optional(),
    schedulePublish: z.boolean().optional(),
  })
  .refine((data) => data.contentItemId != null || data.contentPieceId != null, {
    message: "contentItemId or contentPieceId required",
  });

const contentPublishBody = z.object({
  contentPieceId: z.number().int().positive(),
  platform: z.string().min(1).optional(),
  confirmCmsUpdate: z.boolean().optional(),
  overrideReason: z.string().min(10).max(500).optional(),
});

type TrackJob = (jobId: string, queue: string, meta: Record<string, unknown>) => Promise<void>;

export async function handleContentPiecesQueueWrite(
  request: Request,
  path: string,
  userId: number,
  trackJob?: TrackJob,
): Promise<Response | null> {
  if (path === "/api/content-pieces/generate" && request.method === "POST") {
    const parsed = contentGenerateBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
    }
    const jobId = await sendToCfQueue(QUEUES.contentGenerate, {
      ...parsed.data,
      userId,
    });
    const id = jobId ?? `cf:${QUEUES.contentGenerate}:${Date.now()}`;
    if (trackJob) {
      await trackJob(id, QUEUES.contentGenerate, { userId, projectId: parsed.data.projectId });
    }
    return withCors(request, acceptedJobResponse(id, QUEUES.contentGenerate));
  }

  const publishMatch = path.match(/^\/api\/content-pieces\/(\d+)\/publish$/);
  if (publishMatch && request.method === "POST") {
    const body = (await request.json().catch(() => null)) as {
      contentPieceId?: number;
      platform?: string;
      confirmCmsUpdate?: boolean;
      overrideReason?: string;
    } | null;
    const parsed = contentPublishBody.safeParse({
      contentPieceId: Number.parseInt(publishMatch[1]!, 10),
      platform: body?.platform,
      confirmCmsUpdate: body?.confirmCmsUpdate,
      overrideReason: body?.overrideReason,
    });
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
    }

    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, parsed.data.contentPieceId))
      .limit(1);
    if (!piece) {
      return withCors(request, Response.json({ error: "Content piece not found" }, { status: 404 }));
    }
    const project = await getAccessibleProject(piece.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
    }

    const meta = (piece.pieceMetadata ?? {}) as {
      source?: string;
      sourceUrl?: string;
      cmsRemoteId?: string;
      cmsRemoteLink?: string;
      updateConfirmed?: boolean;
    };
    const isWordpressTarget =
      !parsed.data.platform || parsed.data.platform === "wordpress";
    if (meta.source === "refresh" && isWordpressTarget) {
      const remoteId = meta.cmsRemoteId?.trim();
      if (remoteId && !meta.updateConfirmed && !parsed.data.confirmCmsUpdate) {
        return withCors(
          request,
          Response.json(
            {
              error: "Confirm WordPress update target before publishing",
              needsConfirm: true,
              cmsRemoteId: remoteId,
              cmsRemoteLink: meta.cmsRemoteLink ?? null,
              sourceUrl: meta.sourceUrl ?? null,
            },
            { status: 422 },
          ),
        );
      }
      if (remoteId && parsed.data.confirmCmsUpdate && !meta.updateConfirmed) {
        await db
          .update(contentPiecesTable)
          .set({
            pieceMetadata: {
              ...(typeof piece.pieceMetadata === "object" && piece.pieceMetadata
                ? piece.pieceMetadata
                : {}),
              updateConfirmed: true,
            },
          })
          .where(eq(contentPiecesTable.id, piece.id));
      }
      if (!remoteId && !parsed.data.confirmCmsUpdate) {
        return withCors(
          request,
          Response.json(
            {
              error:
                "No WordPress post matched this URL. Set cmsRemoteId on the piece, or confirm creating a new post.",
              needsConfirm: true,
              cmsRemoteId: null,
              sourceUrl: meta.sourceUrl ?? null,
              createNew: true,
            },
            { status: 422 },
          ),
        );
      }
    }

    const jobId = await sendToCfQueue(QUEUES.contentPublish, {
      contentPieceId: parsed.data.contentPieceId,
      userId,
      platform: parsed.data.platform,
    });
    const id = jobId ?? `cf:${QUEUES.contentPublish}:${Date.now()}`;
    if (trackJob) {
      await trackJob(id, QUEUES.contentPublish, { userId });
    }
    return withCors(request, acceptedJobResponse(id, QUEUES.contentPublish));
  }

  return null;
}
