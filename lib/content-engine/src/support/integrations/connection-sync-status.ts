/**
 * Shared sync-status recording for Search/Analytics property connections.
 *
 * Both the GSC and GA4 sync services previously caught a failed daily sync,
 * logged it, and stopped — leaving the connection looking "connected and
 * verified" in the UI forever, even months after Google revoked the token. A
 * founder relying on this data to know "what's working" had no way to learn
 * the pipe had gone dry.
 *
 * This gives both sync paths one place to record the outcome of every sync
 * attempt (success or failure) onto the connection row, and one place to
 * classify a failure as "the token is dead, reconnecting fixes it" versus
 * "transient, we'll try again tomorrow" — so the UI can tell a founder which
 * one they're looking at.
 */

import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  analyticsPropertyConnectionsTable,
  searchPropertyConnectionsTable,
} from "@workspace/db/schema";

export type SyncStatus = "ok" | "auth_error" | "error";

export type ConnectionKind = "search" | "analytics";

/**
 * Classify a sync failure from its error message.
 *
 * Both `gscSearchAnalytics.ts` and `ga4Analytics.ts` throw
 * `"<API name> failed (<status>): <body>"` on a non-OK response, which is the
 * only signal available here without threading a status code through every
 * fetch call. 401 and 403 both mean Google rejected the credential — a
 * revoked or expired refresh token, or an app whose grant was pulled from the
 * Google Account permissions page. Reconnecting is the fix for both; retrying
 * the same token tomorrow is not. Everything else (429, 5xx, network errors)
 * is transient and worth a silent retry on the next scheduled sync.
 */
export function classifySyncError(err: unknown): { status: SyncStatus; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  const isAuthFailure = /\((401|403)\)/.test(message);
  return {
    status: isAuthFailure ? "auth_error" : "error",
    // Truncated: this is stored for a founder to read in the UI, not a log.
    message: message.slice(0, 300),
  };
}

async function updateConnection(
  kind: ConnectionKind,
  connectionId: number,
  values: { lastSyncedAt: Date; lastSyncStatus: SyncStatus; lastSyncError: string | null },
): Promise<void> {
  if (kind === "search") {
    await db
      .update(searchPropertyConnectionsTable)
      .set(values)
      .where(eq(searchPropertyConnectionsTable.id, connectionId));
    return;
  }
  await db
    .update(analyticsPropertyConnectionsTable)
    .set(values)
    .where(eq(analyticsPropertyConnectionsTable.id, connectionId));
}

/** Record a successful sync on a connection row. */
export async function recordSyncSuccess(kind: ConnectionKind, connectionId: number): Promise<void> {
  await updateConnection(kind, connectionId, {
    lastSyncedAt: new Date(),
    lastSyncStatus: "ok",
    lastSyncError: null,
  });
}

/** Record a failed sync on a connection row, classifying the failure. */
export async function recordSyncFailure(
  kind: ConnectionKind,
  connectionId: number,
  err: unknown,
): Promise<void> {
  const { status, message } = classifySyncError(err);
  await updateConnection(kind, connectionId, {
    lastSyncedAt: new Date(),
    lastSyncStatus: status,
    lastSyncError: message,
  });
}
