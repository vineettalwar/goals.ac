/**
 * Builds the full `PublishReadinessOptions` for a content piece, loading
 * `existingTitles` from the DB and merging the caller's `unattended` flag
 * plus fixed defaults (`checkUnattributedClaims: true`).
 *
 * Keeps the two async publish routes (job handler, v1 API) and the
 * interactive route from duplicating the same query + merge logic.
 */
import { eq, ne, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { PublishReadinessOptions } from "../../content/publish-readiness";

const EXISTING_TITLES_LIMIT = 50;

export type ReadinessOptionsPieceInput = {
  id: number;
  websiteProjectId: number;
  targetKeyword?: string | null;
};

/**
 * Load the most recent published titles for the same project, excluding the
 * piece being published. Returns `undefined` (skip the check) only when the
 * query itself fails — an empty result set is a real, positive answer.
 */
async function loadExistingTitles(
  websiteProjectId: number,
  excludePieceId: number,
): Promise<string[] | undefined> {
  try {
    const rows = await db
      .select({ title: contentPiecesTable.title })
      .from(contentPiecesTable)
      .where(
        and(
          eq(contentPiecesTable.websiteProjectId, websiteProjectId),
          eq(contentPiecesTable.status, "published"),
          ne(contentPiecesTable.id, excludePieceId),
        ),
      )
      .orderBy(desc(contentPiecesTable.updatedAt))
      .limit(EXISTING_TITLES_LIMIT);
    return rows.map((r) => r.title);
  } catch {
    return undefined;
  }
}

export async function buildPublishReadinessOptions(
  piece: ReadinessOptionsPieceInput,
  opts: { unattended: boolean },
): Promise<PublishReadinessOptions> {
  const existingTitles = await loadExistingTitles(piece.websiteProjectId, piece.id);
  return {
    targetKeyword: piece.targetKeyword ?? undefined,
    existingTitles,
    checkUnattributedClaims: true,
    ...(opts.unattended ? { unattended: true } : {}),
  };
}
