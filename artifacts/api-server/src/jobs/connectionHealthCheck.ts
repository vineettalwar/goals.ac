import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { wordpressConnectionsTable, integrationConnectionsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { testWordPressConnection } from "@workspace/connectors/wordpress";
import { testGhostConnection } from "@workspace/connectors/ghost";
import { testWebhookConnection } from "@workspace/connectors/webhook";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ConnectionHealthCheckJobData, ConnectionHealthCheckPayload, PgBoss } from "@workspace/jobs";
import { logger } from "../lib/logger";

/**
 * Registers the handler for the `connection-health-check` queue.
 *
 * Two job shapes share this queue (see `@workspace/jobs/queues`):
 *  - Sweep job (`{}`, cron-triggered): enumerate every `wordpress_connections`
 *    and `integration_connections` row and enqueue one per-row job for each.
 *  - Per-row job (`{ kind, connectionId }`): load that one row, decrypt its
 *    secret, run the matching connector's test function, and persist the
 *    result on the row.
 *
 * Per roadmap §7, the payload only ever carries a `connectionId` — the
 * decrypted secret is resolved here, in the worker process, at the point of
 * egress, and is never logged or written back into a job payload.
 */
export async function registerConnectionHealthCheckHandler(boss: PgBoss): Promise<void> {
  await boss.work<ConnectionHealthCheckJobData>(QUEUES.connectionHealthCheck, async ([job]) => {
    const data = job.data;
    if (isSingleConnectionPayload(data)) {
      await checkSingleConnection(data);
    } else {
      await sweepAllConnections();
    }
  });
}

function isSingleConnectionPayload(
  data: ConnectionHealthCheckJobData
): data is ConnectionHealthCheckPayload {
  return typeof (data as Partial<ConnectionHealthCheckPayload>).connectionId === "number";
}

async function sweepAllConnections(): Promise<void> {
  const [wordpressRows, integrationRows] = await Promise.all([
    db.select({ id: wordpressConnectionsTable.id }).from(wordpressConnectionsTable),
    db.select({ id: integrationConnectionsTable.id }).from(integrationConnectionsTable),
  ]);

  logger.info(
    { wordpress: wordpressRows.length, integration: integrationRows.length },
    "Connection health-check sweep: enumerated connections"
  );

  for (const row of wordpressRows) {
    await enqueue(QUEUES.connectionHealthCheck, { kind: "wordpress", connectionId: row.id });
  }
  for (const row of integrationRows) {
    await enqueue(QUEUES.connectionHealthCheck, { kind: "integration", connectionId: row.id });
  }
}

async function checkSingleConnection(payload: ConnectionHealthCheckPayload): Promise<void> {
  try {
    if (payload.kind === "wordpress") {
      await checkWordPressConnection(payload.connectionId);
    } else {
      await checkIntegrationConnection(payload.connectionId);
    }
  } catch (err) {
    // A single bad connection (unreachable site, revoked credential, ...)
    // must never fail the sweep or take down the worker.
    logger.error(
      { err, kind: payload.kind, connectionId: payload.connectionId },
      "Connection health check failed"
    );
  }
}

async function checkWordPressConnection(connectionId: number): Promise<void> {
  const [connection] = await db
    .select()
    .from(wordpressConnectionsTable)
    .where(eq(wordpressConnectionsTable.id, connectionId))
    .limit(1);

  if (!connection) {
    logger.warn({ connectionId }, "WordPress connection not found for health check");
    return;
  }

  const appPassword = decryptSecret(connection.encryptedAppPassword);
  const result = await testWordPressConnection({
    siteUrl: connection.siteUrl,
    username: connection.username,
    appPassword,
  });

  await db
    .update(wordpressConnectionsTable)
    .set({ lastTestedAt: new Date(), isVerified: result.ok })
    .where(eq(wordpressConnectionsTable.id, connectionId));
}

async function checkIntegrationConnection(connectionId: number): Promise<void> {
  const [connection] = await db
    .select()
    .from(integrationConnectionsTable)
    .where(eq(integrationConnectionsTable.id, connectionId))
    .limit(1);

  if (!connection) {
    logger.warn({ connectionId }, "Integration connection not found for health check");
    return;
  }

  const secret = decryptSecret(connection.encryptedSecret);
  const url = connection.url ?? "";

  let result: { ok: boolean } | undefined;
  if (connection.provider === "ghost") {
    result = await testGhostConnection({ apiUrl: url, adminApiKey: secret });
  } else if (connection.provider === "webhook") {
    result = await testWebhookConnection({ url, signingSecret: secret });
  } else {
    // No test function for this provider yet (e.g. notion, webflow) — skip.
    logger.warn(
      { connectionId, provider: connection.provider },
      "No health-check test function for provider; skipping"
    );
    return;
  }

  await db
    .update(integrationConnectionsTable)
    .set({ lastTestedAt: new Date(), lastTestOk: result.ok })
    .where(eq(integrationConnectionsTable.id, connectionId));
}
