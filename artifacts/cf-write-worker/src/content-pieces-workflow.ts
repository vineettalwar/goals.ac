import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema-sqlite";
import { renderContentForPlatform } from "@workspace/content-engine/adapters/render-service";
import { decryptCmsCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { resolveEntitlementsForProject } from "@workspace/content-engine/support/publishing/resolve-publish-entitlements";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAccessibleProject, requireSiteAdminAccess } from "./project-access";

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

function pieceAccessResponse(
  request: Request,
  error: "not_found" | "forbidden",
): Response {
  if (error === "not_found") {
    return withCors(
      request,
      Response.json({ error: "Content piece not found" }, { status: 404 }),
    );
  }
  return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
}

const previewBody = z.object({
  platform: z.string().min(1),
  outputMode: z.string().optional(),
  editorMode: z.enum(["classic", "gutenberg", "elementor", "divi"]).optional(),
});

export async function handleContentPiecesWorkflowWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const approveMatch = path.match(/^\/api\/content-pieces\/(\d+)\/approve$/);
  if (approveMatch && request.method === "POST") {
    return handleApprove(request, Number.parseInt(approveMatch[1]!, 10), userId);
  }

  const rejectMatch = path.match(/^\/api\/content-pieces\/(\d+)\/reject$/);
  if (rejectMatch && request.method === "POST") {
    return handleReject(request, Number.parseInt(rejectMatch[1]!, 10), userId);
  }

  const submitReviewMatch = path.match(/^\/api\/content-pieces\/(\d+)\/submit-review$/);
  if (submitReviewMatch && request.method === "POST") {
    return handleSubmitReview(request, Number.parseInt(submitReviewMatch[1]!, 10), userId);
  }

  const renderPreviewMatch = path.match(/^\/api\/content-pieces\/(\d+)\/render-preview$/);
  if (renderPreviewMatch && request.method === "POST") {
    return handleRenderPreview(request, Number.parseInt(renderPreviewMatch[1]!, 10), userId);
  }

  return null;
}

async function handleApprove(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const siteAdmin = await requireSiteAdminAccess(userId);
  if (!siteAdmin.ok) {
    return withCors(
      request,
      Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }),
    );
  }

  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error) return pieceAccessResponse(request, access.error);

  const [updated] = await db
    .update(contentPiecesTable)
    .set({
      approvalStatus: "approved",
      approvedByUserId: userId,
      approvedAt: new Date(),
      status: "ready",
    })
    .where(eq(contentPiecesTable.id, contentPieceId))
    .returning();

  return withCors(request, Response.json(updated ?? null));
}

async function handleReject(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const siteAdmin = await requireSiteAdminAccess(userId);
  if (!siteAdmin.ok) {
    return withCors(
      request,
      Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }),
    );
  }

  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error) return pieceAccessResponse(request, access.error);

  const [updated] = await db
    .update(contentPiecesTable)
    .set({
      approvalStatus: "rejected",
      status: "draft",
      approvedByUserId: null,
      approvedAt: null,
    })
    .where(eq(contentPiecesTable.id, contentPieceId))
    .returning();

  return withCors(request, Response.json(updated ?? null));
}

async function handleSubmitReview(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error) return pieceAccessResponse(request, access.error);

  const [updated] = await db
    .update(contentPiecesTable)
    .set({ approvalStatus: "pending_review", status: "ready" })
    .where(eq(contentPiecesTable.id, contentPieceId))
    .returning();

  return withCors(request, Response.json(updated ?? null));
}

async function handleRenderPreview(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = previewBody.safeParse(body);
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
  if (access.error) return pieceAccessResponse(request, access.error);

  const piece = access.piece!;

  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, piece.websiteProjectId))
    .limit(1);

  const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
  const entitlements = await resolveEntitlementsForProject(piece.websiteProjectId, userId);

  const preview = await renderContentForPlatform({
    piece: {
      id: piece.id,
      title: piece.title,
      bodyMarkdown: piece.bodyMarkdown,
      targetKeyword: piece.targetKeyword,
      formatType: piece.formatType,
      pieceMetadata: piece.pieceMetadata,
    },
    platform: parsed.data.platform,
    creds,
    outputMode: parsed.data.outputMode,
    editorMode: parsed.data.editorMode,
    entitlements,
  });

  return withCors(
    request,
    Response.json({
      payloadKind: preview.payloadKind,
      previewHtml: preview.previewHtml,
      previewJson: preview.previewJson,
      warnings: preview.warnings,
      capabilities: preview.capabilities,
    }),
  );
}
