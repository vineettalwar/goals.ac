import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable, brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertPieceOwner } from "@/lib/content/content-pieces-helpers";
import { enrichContentPieceImages, parseImageSettings } from "@workspace/content-engine/article-image-enricher";
import { resolveAiClientForUser } from "@workspace/content-engine/support/resolve-ai-client-for-user";
import type { ContentStyle } from "@workspace/db/schema/website_projects";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const [project] = await db
    .select({ contentStyle: websiteProjectsTable.contentStyle })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, piece!.websiteProjectId))
    .limit(1);

  const [brand] = await db
    .select({ companyName: brandProfilesTable.companyName })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, piece!.websiteProjectId))
    .limit(1);

  const excludeImageIds =
    piece!.pieceMetadata?.images?.map((img) => `${img.provider}:${img.remoteId}`) ?? [];

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "rapid",
    quotaKind: "article",
    companyId: piece!.websiteProjectId,
  });
  if (!billingPrep.ok) return billingPrep.response;

  let ai;
  try {
    const resolved = await resolveAiClientForUser(userId!);
    ai = resolved.client;
  } catch {
    ai = undefined;
  }

  try {
    const enriched = await enrichContentPieceImages(
    {
      title: piece!.title,
      target_keyword: piece!.targetKeyword,
      body_markdown: piece!.bodyMarkdown,
      formatType: piece!.formatType,
      pieceMetadata: piece!.pieceMetadata ?? undefined,
    },
    {
      imageSettings: parseImageSettings(project?.contentStyle as ContentStyle | null),
      ai,
      brandName: brand?.companyName ?? undefined,
      excludeImageIds,
    },
  );

    const wordCount = enriched.body_markdown.split(/\s+/).filter(Boolean).length;

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        bodyMarkdown: enriched.body_markdown,
        pieceMetadata: enriched.pieceMetadata,
        wordCount,
      })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "image_regeneration",
      usedByok: billingPrep.usedByok,
      tier: "rapid",
      companyId: piece!.websiteProjectId,
    });

    return NextResponse.json({ piece: updated });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "image_regeneration_failed");
    const message = err instanceof Error ? err.message : "Image regeneration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
