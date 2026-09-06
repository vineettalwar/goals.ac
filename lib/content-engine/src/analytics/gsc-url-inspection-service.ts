import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  searchPropertyConnectionsTable,
  gscUrlInspectionsTable,
  type GscUrlInspection,
} from "@workspace/db/schema";
import { inspectUrl, type GscUrlInspectionResult } from "@workspace/seo-tools/gscUrlInspection";
import {
  parseStoredTokens,
  resolveAccessToken,
  encryptStoredTokens,
} from "../support/integrations/gsc-connection";
import { logger } from "../core/logger";

export type InspectPublishedUrlInput = {
  projectId: number;
  inspectionUrl: string;
  contentPieceId?: number;
  publishRecordId?: number;
};

export type InspectPublishedUrlResult = GscUrlInspection;

export async function inspectPublishedUrl(
  input: InspectPublishedUrlInput,
): Promise<InspectPublishedUrlResult> {
  const { projectId, inspectionUrl, contentPieceId, publishRecordId } = input;

  const [connection] = await db
    .select()
    .from(searchPropertyConnectionsTable)
    .where(
      and(
        eq(searchPropertyConnectionsTable.projectId, projectId),
        eq(searchPropertyConnectionsTable.provider, "google_search_console"),
      ),
    )
    .limit(1);

  if (!connection?.propertyUrl) {
    throw new Error("No GSC connection found for this project — connect Google Search Console first");
  }

  let tokens = parseStoredTokens(connection.encryptedTokens);
  const resolved = await resolveAccessToken("google_search_console", tokens);
  tokens = resolved.tokens;

  if (resolved.refreshed) {
    await db
      .update(searchPropertyConnectionsTable)
      .set({ encryptedTokens: encryptStoredTokens(tokens) })
      .where(eq(searchPropertyConnectionsTable.id, connection.id));
  }

  let result: GscUrlInspectionResult;
  let errorMessage: string | null = null;
  try {
    result = await inspectUrl({
      accessToken: resolved.accessToken,
      siteUrl: connection.propertyUrl,
      inspectionUrl,
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn({ err, projectId, inspectionUrl }, "GSC URL Inspection call failed");
    result = { inspectionUrl, indexStatusResult: null, raw: null };
  }

  const idx = result.indexStatusResult;

  const [row] = await db
    .insert(gscUrlInspectionsTable)
    .values({
      websiteProjectId: projectId,
      contentPieceId: contentPieceId ?? null,
      publishRecordId: publishRecordId ?? null,
      inspectionUrl,
      siteUrl: connection.propertyUrl,
      verdict: idx?.verdict ?? null,
      coverageState: idx?.coverageState ?? null,
      indexingState: idx?.indexingState ?? null,
      robotsTxtState: idx?.robotsTxtState ?? null,
      pageFetchState: idx?.pageFetchState ?? null,
      googleCanonical: idx?.googleCanonical ?? null,
      userCanonical: idx?.userCanonical ?? null,
      lastCrawlTime: idx?.lastCrawlTime ?? null,
      errorMessage,
      rawJson: result.raw ?? null,
    })
    .returning();

  logger.info(
    { projectId, inspectionUrl, verdict: idx?.verdict },
    "GSC URL Inspection recorded",
  );

  return row;
}
