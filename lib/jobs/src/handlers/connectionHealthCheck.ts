import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { wordpressConnectionsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { testWordPressConnection } from "@workspace/connectors/wordpress";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ConnectionHealthCheckJobData, ConnectionHealthCheckPayload, PgBoss } from "@workspace/jobs";
import { logger } from "../logger";

/**
 * Registers the handler for the `connection-health-check` queue.
 *
 * Two job shapes share this queue (see `@workspace/jobs/queues`):
 *  - Sweep job (`{}`, cron-triggered): enumerate every `wordpress_connections`
 *    row and enqueue one per-row job for each.
 *  - Per-row job (`{ kind, connectionId }`): load that one row, decrypt its
 *    secret, run the matching connector's test function, and persist the
 *    result on the row.
 */
export async function processConnectionHealthCheck(
  data: ConnectionHealthCheckJobData,
): Promise<void> {
  if (isSingleConnectionPayload(data)) {
    await checkSingleConnection(data);
  } else {
    await sweepAllConnections();
  }
}

export async function registerConnectionHealthCheckHandler(boss: PgBoss): Promise<void> {
  await boss.work<ConnectionHealthCheckJobData>(QUEUES.connectionHealthCheck, async ([job]) => {
    await processConnectionHealthCheck(job.data);
  });
}

function isSingleConnectionPayload(
  data: ConnectionHealthCheckJobData
): data is ConnectionHealthCheckPayload {
  return typeof (data as Partial<ConnectionHealthCheckPayload>).connectionId === "number";
}

async function sweepAllConnections(): Promise<void> {
  const wordpressRows = await db
    .select({ id: wordpressConnectionsTable.id })
    .from(wordpressConnectionsTable);

  logger.info(
    { wordpress: wordpressRows.length },
    "Connection health-check sweep: enumerated connections"
  );

  for (const row of wordpressRows) {
    await enqueue(QUEUES.connectionHealthCheck, { kind: "wordpress", connectionId: row.id });
  }
}

async function checkSingleConnection(payload: ConnectionHealthCheckPayload): Promise<void> {
  try {
    if (payload.kind !== "wordpress") {
      logger.warn({ kind: payload.kind }, "Unsupported connection kind for health check; skipping");
      return;
    }
    await checkWordPressConnection(payload.connectionId);
  } catch (err) {
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
