import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import { contentPiecesTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { getAccessibleProject } from "./project-access";
import {
  createDraftBody,
  loadBriefForProject,
  loadPieceForUser,
  patchBody,
  wordCountFromMarkdown,
} from "./content-pieces-shared";

export async function handleContentPiecePatch(
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
  if (parsed.data.status !== undefined) {
    if (access.piece!.status === "generating" && parsed.data.status === "draft") {
      updates.status = "draft";
    } else if (access.piece!.status !== "generating") {
      updates.status = parsed.data.status;
    }
  }
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
  if (parsed.data.cmsRemoteId !== undefined) {
    const prevMeta =
      access.piece!.pieceMetadata && typeof access.piece!.pieceMetadata === "object"
        ? { ...access.piece!.pieceMetadata }
        : {};
    if (parsed.data.cmsRemoteId === null) {
      delete (prevMeta as { cmsRemoteId?: string }).cmsRemoteId;
      delete (prevMeta as { updateConfirmed?: boolean }).updateConfirmed;
    } else {
      (prevMeta as { cmsRemoteId?: string }).cmsRemoteId = parsed.data.cmsRemoteId;
      delete (prevMeta as { updateConfirmed?: boolean }).updateConfirmed;
    }
    updates.pieceMetadata = prevMeta;
  }

  const [updated] = await db
    .update(contentPiecesTable)
    .set(updates)
    .where(eq(contentPiecesTable.id, contentPieceId))
    .returning();

  return withCors(request, Response.json(updated));
}

export async function handleContentPieceDelete(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
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

  if (access.piece!.status === "generating") {
    return withCors(
      request,
      Response.json({ error: "Cannot delete content while it is generating" }, { status: 400 }),
    );
  }

  await db.delete(contentPiecesTable).where(eq(contentPiecesTable.id, contentPieceId));
  return withCors(request, Response.json({ ok: true }));
}

export async function handleContentPieceCreateDraft(
  request: Request,
  projectId: number,
  userId: number,
): Promise<Response> {
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

  const { title, targetKeyword, formatType, briefId } = parsed.data;

  if (briefId && !(await loadBriefForProject(briefId, projectId))) {
    return withCors(request, Response.json({ error: "Brief not found" }, { status: 404 }));
  }

  const [piece] = await db
    .insert(contentPiecesTable)
    .values({
      websiteProjectId: projectId,
      briefId: briefId ?? null,
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
