import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertPieceOwner } from "@/lib/content/content-pieces-helpers";
import { decryptCmsCredentials } from "@workspace/content-engine/support/cms-integrations";
import { renderContentForPlatform } from "@workspace/content-engine/adapters/render-service";
import { resolveEntitlementsForProject } from "@workspace/content-engine/support/resolve-publish-entitlements";

const PreviewBody = z.object({
  platform: z.string().min(1),
  outputMode: z.string().optional(),
  editorMode: z.enum(["classic", "gutenberg", "elementor", "divi"]).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PreviewBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") {
    return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  }
  if (ownerError === "forbidden") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, piece!.websiteProjectId))
    .limit(1);

  const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
  const entitlements = await resolveEntitlementsForProject(piece!.websiteProjectId, userId!);

  const preview = await renderContentForPlatform({
    piece: {
      id: piece!.id,
      title: piece!.title,
      bodyMarkdown: piece!.bodyMarkdown,
      targetKeyword: piece!.targetKeyword,
      formatType: piece!.formatType,
      pieceMetadata: piece!.pieceMetadata,
    },
    platform: parsed.data.platform,
    creds,
    outputMode: parsed.data.outputMode,
    editorMode: parsed.data.editorMode,
    entitlements,
  });

  return NextResponse.json({
    payloadKind: preview.payloadKind,
    previewHtml: preview.previewHtml,
    previewJson: preview.previewJson,
    warnings: preview.warnings,
    capabilities: preview.capabilities,
  });
}
