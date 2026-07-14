import { db } from "@workspace/db";
import { publishRecordsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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
