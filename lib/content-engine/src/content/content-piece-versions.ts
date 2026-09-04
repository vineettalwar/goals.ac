/**
 * Version history for content pieces.
 *
 * `content_pieces` is mutated in place by generation, humanization,
 * regeneration and manual edits — the audit only ever had one ad-hoc field
 * (`pieceMetadata.preHumanizeBodyMarkdown`) preserving a single prior draft
 * before a humanize pass. This module gives every meaningful body/title
 * change a durable, retrievable snapshot in `content_piece_versions`.
 *
 * Callers record the OLD state right before they overwrite a piece — see
 * the humanize, regenerate, and manual-edit routes for the wiring.
 */

import { db } from "@workspace/db";
import { contentPieceVersionsTable } from "@workspace/db/schema";
import type {
  ContentPieceMetadata,
  ContentPieceVersion,
  ContentPieceVersionChangeType,
} from "@workspace/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export type RecordContentPieceVersionInput = {
  contentPieceId: number;
  title: string;
  bodyMarkdown: string;
  pieceMetadata?: ContentPieceMetadata | null;
  changeType: ContentPieceVersionChangeType;
  /** Absent for system-driven changes (generate/humanize/regenerate jobs without a human at the wheel). */
  createdByUserId?: number | null;
};

/**
 * Snapshots the given state of a content piece as its next version.
 *
 * Version numbers are per-piece and sequential, computed from the current
 * max rather than a counter column, so a version can never be skipped or
 * collide even under concurrent writers (the unique index on
 * (contentPieceId, versionNumber) is the backstop if it ever does).
 */
export async function recordContentPieceVersion(
  input: RecordContentPieceVersionInput,
): Promise<ContentPieceVersion> {
  const [{ nextVersion }] = await db
    .select({
      nextVersion: sql<number>`coalesce(max(${contentPieceVersionsTable.versionNumber}), 0) + 1`,
    })
    .from(contentPieceVersionsTable)
    .where(eq(contentPieceVersionsTable.contentPieceId, input.contentPieceId));

  const [inserted] = await db
    .insert(contentPieceVersionsTable)
    .values({
      contentPieceId: input.contentPieceId,
      versionNumber: nextVersion,
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      pieceMetadata: input.pieceMetadata ?? null,
      changeType: input.changeType,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning();

  return inserted!;
}

/** Newest first — the order a version history UI or API wants by default. */
export async function listContentPieceVersions(
  contentPieceId: number,
): Promise<ContentPieceVersion[]> {
  return db
    .select()
    .from(contentPieceVersionsTable)
    .where(eq(contentPieceVersionsTable.contentPieceId, contentPieceId))
    .orderBy(desc(contentPieceVersionsTable.versionNumber));
}

export async function getContentPieceVersion(
  contentPieceId: number,
  versionNumber: number,
): Promise<ContentPieceVersion | null> {
  const [row] = await db
    .select()
    .from(contentPieceVersionsTable)
    .where(
      and(
        eq(contentPieceVersionsTable.contentPieceId, contentPieceId),
        eq(contentPieceVersionsTable.versionNumber, versionNumber),
      ),
    )
    .limit(1);
  return row ?? null;
}
