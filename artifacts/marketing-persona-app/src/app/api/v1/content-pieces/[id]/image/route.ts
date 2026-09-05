import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable, brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  assertProjectInOrg,
  resolveOrgBillingUserId,
} from "@workspace/content-engine/support/auth/api-key-auth";
import {
  enrichContentPieceImages,
  parseImageSettings,
} from "@workspace/content-engine/articles/article-image-enricher";
import { loadStockCredentialContextForProject } from "@workspace/content-engine/support/integrations/stock-credentials";
import type { ContentStyle } from "@workspace/db/schema/website_projects";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { requireApiKeyScope, withPublicApiKey } from "@/lib/public-api/auth";

/**
 * Attaches a licensed stock photo (Unsplash/Pexels) to a generated piece as
 * its featured image, sourced by the piece's own headings/keyword. There is
 * no AI image-generation provider wired into goals.ac yet (no DALL-E /
 * Stable Diffusion / fal.ai image model) — this is stock search + attribution,
 * the same capability the interactive Studio's "Regenerate image" uses.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPublicApiKey(req, async (key) => {
    requireApiKeyScope(key, "image:generate");

    const { id } = await params;
    const pieceId = Number(id);
    if (!pieceId) {
      return NextResponse.json({ error: "Invalid content piece id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { projectId?: number };
    if (!body.projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    await assertProjectInOrg(body.projectId, key.organizationId);

    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, pieceId))
      .limit(1);

    if (!piece || piece.websiteProjectId !== body.projectId) {
      return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
    }

    const [[project], [brand]] = await Promise.all([
      db
        .select({ contentStyle: websiteProjectsTable.contentStyle })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, piece.websiteProjectId))
        .limit(1),
      db
        .select({ companyName: brandProfilesTable.companyName })
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, piece.websiteProjectId))
        .limit(1),
    ]);

    const excludeImageIds =
      piece.pieceMetadata?.images?.map((img) => `${img.provider}:${img.remoteId}`) ?? [];

    const billingUserId = await resolveOrgBillingUserId(key.organizationId);
    if (!billingUserId) {
      return NextResponse.json({ error: "Organization has no billing owner" }, { status: 500 });
    }

    const billingPrep = await prepareAiBilling({
      userId: billingUserId,
      tier: "rapid",
      quotaKind: "article",
      companyId: piece.websiteProjectId,
    });
    if (!billingPrep.ok) return billingPrep.response;

    try {
      const stockCredentials = await loadStockCredentialContextForProject(piece.websiteProjectId);
      const enriched = await enrichContentPieceImages(
        {
          title: piece.title,
          target_keyword: piece.targetKeyword,
          body_markdown: piece.bodyMarkdown,
          formatType: piece.formatType,
          pieceMetadata: piece.pieceMetadata ?? undefined,
        },
        {
          imageSettings: parseImageSettings(project?.contentStyle as ContentStyle | null),
          brandName: brand?.companyName ?? undefined,
          excludeImageIds,
          stockCredentials,
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
        .where(eq(contentPiecesTable.id, pieceId))
        .returning();

      await completeAiBilling(billingPrep.ctx, {
        userId: billingUserId,
        eventType: "image_regeneration",
        usedByok: billingPrep.usedByok,
        tier: "rapid",
        companyId: piece.websiteProjectId,
      });

      return NextResponse.json({ piece: updated });
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "image_generation_failed");
      const message = err instanceof Error ? err.message : "Image generation failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
