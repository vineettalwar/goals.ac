import { db } from "@workspace/db";
import { contentPiecesTable, publishRecordsTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";

export function buildPublishIdempotencyKey(
  contentPieceId: number,
  provider: string,
  connectionId?: number | null,
): string {
  const suffix = connectionId != null ? `:conn-${connectionId}` : "";
  return `piece-${contentPieceId}:${provider}${suffix}`;
}

export async function startPublishRecord(input: {
  contentPieceId: number;
  websiteProjectId: number;
  provider: string;
  connectionId?: number | null;
  idempotencyKey?: string;
}): Promise<string> {
  const idempotencyKey =
    input.idempotencyKey ??
    buildPublishIdempotencyKey(input.contentPieceId, input.provider, input.connectionId);

  await db
    .insert(publishRecordsTable)
    .values({
      contentPieceId: input.contentPieceId,
      websiteProjectId: input.websiteProjectId,
      provider: input.provider,
      connectionId: input.connectionId ?? null,
      idempotencyKey,
      status: "pending",
      errorMessage: null,
    })
    .onConflictDoUpdate({
      target: publishRecordsTable.idempotencyKey,
      set: {
        status: "pending",
        errorMessage: null,
        remoteId: null,
        remoteUrl: null,
        publishedAt: null,
        updatedAt: new Date(),
      },
    });

  return idempotencyKey;
}

export async function markPublishRecordSucceeded(input: {
  idempotencyKey: string;
  remoteId?: string | null;
  remoteUrl: string;
}): Promise<void> {
  await db
    .update(publishRecordsTable)
    .set({
      status: "published",
      remoteId: input.remoteId ?? null,
      remoteUrl: input.remoteUrl,
      errorMessage: null,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(publishRecordsTable.idempotencyKey, input.idempotencyKey));
}

export async function markPublishRecordFailed(input: {
  idempotencyKey: string;
  errorMessage: string;
}): Promise<void> {
  await db
    .update(publishRecordsTable)
    .set({
      status: "failed",
      errorMessage: input.errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(publishRecordsTable.idempotencyKey, input.idempotencyKey));
}

export interface PublishAttemptResult {
  publishedUrl: string;
  publishPlatform: string;
  remotePostId?: string;
}

export type PublishRecordListItem = {
  id: number;
  contentPieceId: number;
  websiteProjectId: number;
  provider: string;
  status: string;
  remoteUrl: string | null;
  errorMessage: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  pieceTitle: string | null;
  /** Not stored on publish_records today; reserved for UI when available. */
  outputMode: string | null;
};

export async function listPublishRecordsForProject(
  websiteProjectId: number,
  limit = 50,
): Promise<PublishRecordListItem[]> {
  const rows = await db
    .select({
      id: publishRecordsTable.id,
      contentPieceId: publishRecordsTable.contentPieceId,
      websiteProjectId: publishRecordsTable.websiteProjectId,
      provider: publishRecordsTable.provider,
      status: publishRecordsTable.status,
      remoteUrl: publishRecordsTable.remoteUrl,
      errorMessage: publishRecordsTable.errorMessage,
      publishedAt: publishRecordsTable.publishedAt,
      createdAt: publishRecordsTable.createdAt,
      updatedAt: publishRecordsTable.updatedAt,
      pieceTitle: contentPiecesTable.title,
    })
    .from(publishRecordsTable)
    .leftJoin(
      contentPiecesTable,
      eq(publishRecordsTable.contentPieceId, contentPiecesTable.id),
    )
    .where(eq(publishRecordsTable.websiteProjectId, websiteProjectId))
    .orderBy(desc(publishRecordsTable.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    pieceTitle: row.pieceTitle ?? null,
    outputMode: null,
  }));
}

export async function withPublishRecord(
  input: {
    contentPieceId: number;
    websiteProjectId: number;
    provider: string;
    connectionId?: number | null;
  },
  publish: (idempotencyKey: string) => Promise<PublishAttemptResult>,
): Promise<PublishAttemptResult> {
  const idempotencyKey = await startPublishRecord(input);
  try {
    const result = await publish(idempotencyKey);
    await markPublishRecordSucceeded({
      idempotencyKey,
      remoteId: result.remotePostId ?? null,
      remoteUrl: result.publishedUrl,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    await markPublishRecordFailed({ idempotencyKey, errorMessage: message });
    throw err;
  }
}
