import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { websiteProjectsTable, wordpressConnectionsTable, organizationsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { testWordPressConnection } from "@workspace/connectors/wordpress";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ConnectionHealthCheckJobData, ConnectionHealthCheckPayload, PgBoss } from "@workspace/jobs";
import {
  applyIntegrationHealthTransition,
  detectHealthTransition,
} from "@workspace/content-engine/support/publishing/integration-health-alerts";
import { logger } from "../logger";

/**
 * Registers the handler for the `connection-health-check` queue.
 *
 * Two job shapes share this queue (see `@workspace/jobs/queues`):
 *  - Sweep job (`{}`, cron-triggered): enumerate WordPress connections and
 *    projects with CMS credentials; enqueue one per-target job each.
 *  - Per-target job (`{ kind, connectionId }`): live-test and persist results.
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

  const projectRows = await db
    .select({ id: websiteProjectsTable.id, cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable);

  const projectsWithCms = projectRows.filter((row) => {
    const integrations = row.cmsIntegrations as Record<string, unknown> | null;
    if (!integrations || typeof integrations !== "object") return false;
    // Credentials are stored under the platform key; UI `connected` is mask-derived.
    return Object.values(integrations).some(
      (entry) => entry != null && typeof entry === "object",
    );
  });

  logger.info(
    { wordpress: wordpressRows.length, projects: projectsWithCms.length },
    "Connection health-check sweep: enumerated connections",
  );

  for (const row of wordpressRows) {
    await enqueue(QUEUES.connectionHealthCheck, { kind: "wordpress", connectionId: row.id });
  }
  for (const row of projectsWithCms) {
    await enqueue(QUEUES.connectionHealthCheck, {
      kind: "project_cms",
      connectionId: row.id,
    });
  }
}

async function checkSingleConnection(payload: ConnectionHealthCheckPayload): Promise<void> {
  try {
    if (payload.kind === "wordpress") {
      await checkWordPressConnection(payload.connectionId);
      return;
    }
    if (payload.kind === "project_cms") {
      const { runProjectIntegrationHealth } = await import(
        "@workspace/content-engine/support/publishing/integration-health-service"
      );
      await runProjectIntegrationHealth(payload.connectionId);
      return;
    }
    logger.warn({ kind: (payload as { kind: string }).kind }, "Unsupported connection kind for health check; skipping");
  } catch (err) {
    logger.error(
      { err, kind: payload.kind, connectionId: payload.connectionId },
      "Connection health check failed",
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

  const previousOk = connection.isVerified;

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

  // Wire legacy WordPress connections through the health-alert transition.
  // Chain: wordpressConnection.companyId → organization.companyId → project.organizationId
  const transition = detectHealthTransition(previousOk, result.ok);
  if (transition !== "no_change") {
    try {
      const [org] = await db
        .select({ id: organizationsTable.id })
        .from(organizationsTable)
        .where(eq(organizationsTable.companyId, connection.companyId))
        .limit(1);

      if (org) {
        const projects = await db
          .select({ id: websiteProjectsTable.id })
          .from(websiteProjectsTable)
          .where(eq(websiteProjectsTable.organizationId, org.id));

        for (const project of projects) {
          await applyIntegrationHealthTransition({
            websiteProjectId: project.id,
            organizationId: org.id,
            platform: "wordpress",
            previousOk,
            currentOk: result.ok,
            error: result.ok ? undefined : (result as { error?: string }).error,
          });
        }
      }
    } catch (err) {
      logger.error({ err, connectionId }, "Failed to apply health transition for legacy WordPress connection");
    }
  }
}
