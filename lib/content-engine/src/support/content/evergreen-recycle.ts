import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../core/logger";
import { isEvergreenDue, suggestNextSlot, platformForPiece } from "../social/social-queue-service";

export async function recycleEvergreenPiece(pieceId: number): Promise<number | null> {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, pieceId))
    .limit(1);
  if (!piece || !isEvergreenDue(piece)) return null;

  const platform = platformForPiece(piece);
  const scheduledAt = platform
    ? await suggestNextSlot(piece.websiteProjectId, platform)
    : null;

  const config = piece.evergreenConfig;
  const [clone] = await db
    .insert(contentPiecesTable)
    .values({
      websiteProjectId: piece.websiteProjectId,
      parentPieceId: piece.parentPieceId ?? piece.id,
      formatType: piece.formatType,
      title: piece.title,
      targetKeyword: piece.targetKeyword,
      bodyMarkdown: piece.bodyMarkdown,
      wordCount: piece.wordCount,
      status: "draft",
      approvalStatus: "draft",
      publishPlatform: piece.publishPlatform,
      scheduledAt,
      pieceMetadata: piece.pieceMetadata,
      evergreenConfig: config
        ? {
            ...config,
            recycleCount: (config.recycleCount ?? 0) + 1,
          }
        : null,
    })
    .returning();

  if (config) {
    await db
      .update(contentPiecesTable)
      .set({
        evergreenConfig: {
          ...config,
          recycleCount: (config.recycleCount ?? 0) + 1,
        },
      })
      .where(eq(contentPiecesTable.id, piece.id));
  }

  logger.info({ sourcePieceId: piece.id, cloneId: clone?.id }, "Evergreen piece recycled");
  return clone?.id ?? null;
}
