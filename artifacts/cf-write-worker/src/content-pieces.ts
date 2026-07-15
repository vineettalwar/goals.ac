import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { db } from "@workspace/db";
import {
  CONTENT_FORMAT_TYPES,
  contentPiecesTable,
} from "@workspace/db/schema-sqlite";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ownedProject } from "./project-access";

const GENERATABLE_STATUSES = new Set(["draft", "pending", "failed"]);

const createDraftBody = z.object({
  title: z.string().trim().min(1, "Title is required"),
  targetKeyword: z.string().trim().min(1, "Target keyword is required"),
  formatType: z.enum(CONTENT_FORMAT_TYPES).optional().default("blog_post"),
});

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

  const match = path.match(/^\/api\/website-projects\/(\d+)\/content-pieces$/);
  if (!match || request.method !== "POST") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await ownedProject(projectId, userId);
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

  const project = await ownedProject(piece.websiteProjectId, userId);
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
