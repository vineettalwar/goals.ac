import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { db } from "@workspace/db";
import {
  CONTENT_FORMAT_TYPES,
  contentPiecesTable,
  type ContentFormatType,
} from "@workspace/db/schema-sqlite";
import { humanizeContentPiece } from "@workspace/content-engine/content/humanizer";
import { isSeoLongformFormat } from "@workspace/content-engine/content/content-piece-seo";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { getAccessibleProject } from "./project-access";

const GENERATABLE_STATUSES = new Set(["draft", "pending", "failed"]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const patchBody = z
  .object({
    title: z.string().optional(),
    bodyMarkdown: z.string().optional(),
    status: z.enum(["draft", "ready"]).optional(),
    plannedDate: z
      .string()
      .regex(ISO_DATE_RE, "plannedDate must be a valid ISO date (YYYY-MM-DD)")
      .nullable()
      .optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
    approvalStatus: z
      .enum(["draft", "pending_review", "approved", "rejected"])
      .optional(),
    evergreenConfig: z
      .object({
        enabled: z.boolean(),
        recycleIntervalDays: z.number().int().min(7).max(365),
        maxRecycles: z.number().int().min(1).max(50).optional(),
        recycleCount: z.number().int().min(0).optional(),
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Request body must include at least one field to update",
  });

const createDraftBody = z.object({
  title: z.string().trim().min(1, "Title is required"),
  targetKeyword: z.string().trim().min(1, "Target keyword is required"),
  formatType: z.enum(CONTENT_FORMAT_TYPES).optional().default("blog_post"),
});

function wordCountFromMarkdown(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

async function loadPieceForUser(contentPieceId: number, userId: number) {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, contentPieceId))
    .limit(1);

  if (!piece) return { piece: null, error: "not_found" as const };

  const project = await getAccessibleProject(piece.websiteProjectId, userId);
  if (!project) return { piece: null, error: "forbidden" as const };

  return { piece, error: null };
}

export async function handleContentPiecesWrite(
  request: Request,
  path: string,
  userId: number,
  trackJob?: (jobId: string, queue: string, meta: Record<string, unknown>) => Promise<void>,
): Promise<Response | null> {
  const generateMatch = path.match(/^\/api\/content-pieces\/(\d+)\/generate$/);
  if (generateMatch && request.method === "POST") {
    return handleContentPieceGenerate(
      request,
      Number.parseInt(generateMatch[1]!, 10),
      userId,
      trackJob,
    );
  }

  const humanizeMatch = path.match(/^\/api\/content-pieces\/(\d+)\/humanize$/);
  if (humanizeMatch && request.method === "POST") {
    return handleContentPieceHumanize(
      request,
      Number.parseInt(humanizeMatch[1]!, 10),
      userId,
    );
  }

  const patchMatch = path.match(/^\/api\/content-pieces\/(\d+)$/);
  if (patchMatch && request.method === "PATCH") {
    return handleContentPiecePatch(
      request,
      Number.parseInt(patchMatch[1]!, 10),
      userId,
    );
  }

  const match = path.match(/^\/api\/website-projects\/(\d+)\/content-pieces$/);
  if (!match || request.method !== "POST") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const parsed = createDraftBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const { title, targetKeyword, formatType } = parsed.data;

  const [piece] = await db
    .insert(contentPiecesTable)
    .values({
      websiteProjectId: projectId,
      title,
      targetKeyword,
      formatType,
      status: "draft",
      bodyMarkdown: "",
      wordCount: 0,
    })
    .returning();

  return withCors(request, Response.json(piece, { status: 201 }));
}

async function handleContentPiecePatch(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = patchBody.safeParse(body);
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(
      request,
      Response.json({ error: "Content piece not found" }, { status: 404 }),
    );
  }
  if (access.error === "forbidden") {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.bodyMarkdown !== undefined) {
    updates.bodyMarkdown = parsed.data.bodyMarkdown;
    updates.wordCount = wordCountFromMarkdown(parsed.data.bodyMarkdown);
  }
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.plannedDate !== undefined) updates.plannedDate = parsed.data.plannedDate;
  if (parsed.data.scheduledAt !== undefined) {
    updates.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  }
  if (parsed.data.approvalStatus !== undefined) {
    updates.approvalStatus = parsed.data.approvalStatus;
  }
  if (parsed.data.evergreenConfig !== undefined) {
    updates.evergreenConfig = parsed.data.evergreenConfig;
  }

  const [updated] = await db
    .update(contentPiecesTable)
    .set(updates)
    .where(eq(contentPiecesTable.id, contentPieceId))
    .returning();

  return withCors(request, Response.json(updated));
}

async function handleContentPieceHumanize(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(
      request,
      Response.json({ error: "Content piece not found" }, { status: 404 }),
    );
  }
  if (access.error === "forbidden") {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece!;
  const formatType = piece.formatType as ContentFormatType;
  if (!isSeoLongformFormat(formatType) && formatType !== "linkedin_post") {
    return withCors(
      request,
      Response.json(
        {
          error: "Humanization is available for long-form SEO content and LinkedIn posts",
        },
        { status: 400 },
      ),
    );
  }

  const brand = await loadBrandContextForProject(piece.websiteProjectId);
  if (!brand) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const [{ userApiKey, aiProviderOptions }, billingPrep] = await Promise.all([
    Promise.all([getDecryptedUserGeminiKey(userId), getUserAiProviderOptions(userId)]).then(
      ([key, options]) => ({ userApiKey: key, aiProviderOptions: options }),
    ),
    prepareAiBilling({
      userId,
      tier: "execution",
      quotaKind: "article",
    }),
  ]);

  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  try {
    const { result, humanized, audit } = await humanizeContentPiece(
      {
        title: piece.title,
        target_keyword: piece.targetKeyword ?? "",
        body_markdown: piece.bodyMarkdown ?? "",
        meta_description: piece.pieceMetadata?.metaDescription,
        pieceMetadata: piece.pieceMetadata ?? undefined,
      },
      brand,
      { userApiKey, aiProviderOptions },
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        pieceMetadata: result.pieceMetadata ?? null,
        status: "draft",
      })
      .where(eq(contentPiecesTable.id, contentPieceId))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "content_humanize",
      usedByok: billingPrep.usedByok,
      tier: "execution",
    });

    return withCors(
      request,
      Response.json({
        ...updated,
        humanized,
        audit,
      }),
    );
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx);
    const message = err instanceof Error ? err.message : "Humanization failed";
    return withCors(request, Response.json({ error: message }, { status: 503 }));
  }
}

async function handleContentPieceGenerate(
  request: Request,
  contentPieceId: number,
  userId: number,
  trackJob?: (jobId: string, queue: string, meta: Record<string, unknown>) => Promise<void>,
): Promise<Response> {
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
