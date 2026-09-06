import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  brandProfilesTable,
  contentPiecesTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import {
  applyStockPhotoToPiece,
  enrichContentPieceImages,
  parseImageSettings,
} from "@workspace/content-engine/articles/article-image-enricher";
import { loadStockCredentialContextForProject } from "@workspace/content-engine/support/integrations/stock-credentials";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import {
  acknowledgeStockPhotoSelection,
  rankStockPhotos,
  searchStockPhotos,
} from "@workspace/stock-images";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { loadPieceForUser, wordCountFromMarkdown } from "./content-pieces-ai";

export const attachStockBody = z.object({
  role: z.enum(["featured", "inline"]),
  searchQuery: z.string().trim().max(200).optional(),
  sectionHeading: z.string().trim().max(200).optional(),
  alt: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  bodyMarkdown: z.string().max(500_000).optional(),
  photo: z.object({
    provider: z.enum(["unsplash", "pexels"]),
    id: z.string().trim().min(1).max(120),
    url: z.string().url(),
    photographer: z.string().trim().max(200).default(""),
    photographerUrl: z.string().trim().max(500).default(""),
    description: z.string().trim().max(500).optional(),
    rankScore: z.number().optional(),
  }),
});

export async function handleImagesSearch(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
  }
  if (access.error === "forbidden" || !access.piece) {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece;
  const q =
    new URL(request.url).searchParams.get("q")?.trim() ||
    piece.targetKeyword?.trim() ||
    piece.title;
  if (!q) {
    return withCors(request, Response.json({ error: "Query required" }, { status: 400 }));
  }

  const [project] = await db
    .select({ contentStyle: websiteProjectsTable.contentStyle })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, piece.websiteProjectId))
    .limit(1);

  const settings = parseImageSettings(project?.contentStyle ?? null);
  const stockCredentials = await loadStockCredentialContextForProject(piece.websiteProjectId);

  try {
    const photos = await searchStockPhotos(q, {
      provider: settings.stockProvider ?? "auto",
      orientation: "landscape",
      perPage: 18,
      credentials: stockCredentials,
    });
    const ranked = rankStockPhotos(q, photos, { orientation: "landscape" });
    return withCors(
      request,
      Response.json({
        query: q,
        photos: ranked.map((photo) => ({
          provider: photo.provider,
          id: photo.id,
          url: photo.url,
          previewUrl: photo.previewUrl,
          width: photo.width,
          height: photo.height,
          photographer: photo.photographer,
          photographerUrl: photo.photographerUrl,
          description: photo.description,
          rankScore: photo.rankScore,
        })),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stock search failed";
    return withCors(request, Response.json({ error: message }, { status: 502 }));
  }
}

export async function handleImagesAttach(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
  }
  if (access.error === "forbidden" || !access.piece) {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const parsed = attachStockBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const piece = access.piece;
  const stockCredentials = await loadStockCredentialContextForProject(piece.websiteProjectId);

  try {
    await acknowledgeStockPhotoSelection(parsed.data.photo, stockCredentials);
    const enriched = applyStockPhotoToPiece(
      {
        title: piece.title,
        target_keyword: piece.targetKeyword ?? piece.title,
        body_markdown: parsed.data.bodyMarkdown ?? piece.bodyMarkdown ?? "",
        formatType: piece.formatType,
        pieceMetadata: piece.pieceMetadata ?? undefined,
      },
      parsed.data.photo,
      {
        role: parsed.data.role,
        searchQuery: parsed.data.searchQuery,
        sectionHeading: parsed.data.sectionHeading,
        alt: parsed.data.alt,
        title: parsed.data.title,
      },
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        bodyMarkdown: enriched.body_markdown,
        pieceMetadata: enriched.pieceMetadata,
        wordCount: wordCountFromMarkdown(enriched.body_markdown),
      })
      .where(eq(contentPiecesTable.id, contentPieceId))
      .returning();

    return withCors(request, Response.json({ piece: updated }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to attach stock image";
    const status = /not allowed|must use HTTPS|Invalid stock/i.test(message) ? 400 : 500;
    return withCors(request, Response.json({ error: message }, { status }));
  }
}

export async function handleImagesRegenerate(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
  }
  if (access.error === "forbidden") {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece!;
  const [[project], [brandProfile], billingPrep] = await Promise.all([
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
    prepareAiBilling({
      userId,
      tier: "rapid",
      quotaKind: "article",
      companyId: piece.websiteProjectId,
    }),
  ]);
  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  let ai;
  try {
    const resolved = await resolveAiClientForUser(userId);
    ai = resolved.client;
  } catch {
    ai = undefined;
  }

  const excludeImageIds =
    piece.pieceMetadata?.images?.map((img) => `${img.provider}:${img.remoteId}`) ?? [];

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
        imageSettings: parseImageSettings(project?.contentStyle ?? null),
        ai,
        brandName: brandProfile?.companyName ?? undefined,
        excludeImageIds,
        stockCredentials,
      },
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        bodyMarkdown: enriched.body_markdown,
        pieceMetadata: enriched.pieceMetadata,
        wordCount: wordCountFromMarkdown(enriched.body_markdown),
      })
      .where(eq(contentPiecesTable.id, contentPieceId))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "image_regeneration",
      usedByok: billingPrep.usedByok,
      tier: "rapid",
      companyId: piece.websiteProjectId,
    });

    return withCors(request, Response.json({ piece: updated }));
  } catch (err) {
    await cancelAiBilling(
      billingPrep.ctx,
      err instanceof Error ? err.message : "image_regeneration_failed",
    );
    const message = err instanceof Error ? err.message : "Image regeneration failed";
    return withCors(request, Response.json({ error: message }, { status: 500 }));
  }
}
