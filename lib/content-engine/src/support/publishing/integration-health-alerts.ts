import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  integrationHealthAlertsTable,
  websiteProjectsTable,
  usersTable,
  organizationsTable,
} from "@workspace/db/schema";
import type {
  IntegrationHealthAlert,
  IntegrationHealthAlertType,
} from "@workspace/db/schema";
import { logger } from "../../core/logger";
import {
  sendPlatformEmail,
  resolveAppOrigin,
} from "../email/send-platform-email";

/** Substrings (matched case-insensitively) that indicate an auth-shaped failure. */
const REAUTH_SIGNALS = [
  "401",
  "403",
  "unauthor",
  "forbidden",
  "invalid token",
  "invalid integration token",
  "invalid api key",
  "invalid credentials",
  "invalid app password",
  "invalid client",
  "expired",
  "revoked",
  "re-auth",
  "reauth",
  "authentication",
];

/** Classifies a health-check error as needing reauthorization vs. a generic connection failure. */
export function classifyIntegrationAlertType(error?: string | null): IntegrationHealthAlertType {
  if (!error) return "connection_failing";
  const normalized = error.toLowerCase();
  return REAUTH_SIGNALS.some((signal) => normalized.includes(signal))
    ? "reauth_required"
    : "connection_failing";
}

export type HealthTransition = "flipped_to_failing" | "flipped_to_healthy" | "no_change";

/**
 * Compares a health check's previous and current `ok` state and reports
 * whether the connection just started failing (previously healthy or
 * never-checked) or just recovered (previously failing).
 */
export function detectHealthTransition(
  previousOk: boolean | null | undefined,
  currentOk: boolean | null | undefined,
): HealthTransition {
  if (currentOk === true) {
    return previousOk === false ? "flipped_to_healthy" : "no_change";
  }
  if (currentOk === false) {
    return previousOk !== false ? "flipped_to_failing" : "no_change";
  }
  // currentOk === null/undefined: not connected or not testable — nothing to alert on.
  return "no_change";
}

export type ApplyIntegrationHealthTransitionInput = {
  websiteProjectId: number;
  organizationId: number | null;
  platform: string;
  previousOk: boolean | null | undefined;
  currentOk: boolean | null | undefined;
  error?: string | null;
};

/**
 * Applies a health-check result's ok/failing transition to the
 * `integration_health_alerts` table:
 *  - healthy/unknown -> failing opens a new alert (skipped if one is already
 *    open for this project+platform, so repeated failing checks don't
 *    duplicate).
 *  - failing -> healthy auto-resolves any open alert for this project+platform.
 *
 * Called from the health-check writer immediately before it persists the new
 * `lastHealthOk` value, so `previousOk` must be the value read *before* that
 * write. Never throws — a failure to write the alert should not fail the
 * health check itself.
 */
export async function applyIntegrationHealthTransition(
  input: ApplyIntegrationHealthTransitionInput,
): Promise<void> {
  const transition = detectHealthTransition(input.previousOk, input.currentOk);
  if (transition === "no_change") return;

  if (transition === "flipped_to_failing") {
    try {
      const existingOpen = await db
        .select({ id: integrationHealthAlertsTable.id })
        .from(integrationHealthAlertsTable)
        .where(
          and(
            eq(integrationHealthAlertsTable.websiteProjectId, input.websiteProjectId),
            eq(integrationHealthAlertsTable.platform, input.platform),
            eq(integrationHealthAlertsTable.status, "open"),
          ),
        )
        .limit(1);

      if (existingOpen.length > 0) return;

      await db.insert(integrationHealthAlertsTable).values({
        websiteProjectId: input.websiteProjectId,
        organizationId: input.organizationId,
        platform: input.platform,
        alertType: classifyIntegrationAlertType(input.error),
        message: input.error?.trim() || `${input.platform} connection is failing health checks`,
        status: "open",
      });

      // Fire-and-forget email to project owner + org owner
      notifyHealthFlip(input).catch((err) => {
        logger.error({ err, websiteProjectId: input.websiteProjectId }, "Health-flip email failed");
      });
    } catch (err) {
      logger.error(
        { err, websiteProjectId: input.websiteProjectId, platform: input.platform },
        "Failed to create integration health alert",
      );
    }
    return;
  }

  // flipped_to_healthy
  try {
    await db
      .update(integrationHealthAlertsTable)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(
        and(
          eq(integrationHealthAlertsTable.websiteProjectId, input.websiteProjectId),
          eq(integrationHealthAlertsTable.platform, input.platform),
          eq(integrationHealthAlertsTable.status, "open"),
        ),
      );
  } catch (err) {
    logger.error(
      { err, websiteProjectId: input.websiteProjectId, platform: input.platform },
      "Failed to auto-resolve integration health alert",
    );
  }
}

/** Open (undismissed, unresolved) alerts for a project, newest first. */
export async function listOpenIntegrationHealthAlerts(
  websiteProjectId: number,
): Promise<IntegrationHealthAlert[]> {
  return db
    .select()
    .from(integrationHealthAlertsTable)
    .where(
      and(
        eq(integrationHealthAlertsTable.websiteProjectId, websiteProjectId),
        eq(integrationHealthAlertsTable.status, "open"),
      ),
    )
    .orderBy(desc(integrationHealthAlertsTable.createdAt));
}

/** Marks an open alert dismissed by the user. Returns the updated row, or null if not found. */
export async function dismissIntegrationHealthAlert(
  alertId: number,
): Promise<IntegrationHealthAlert | null> {
  const [updated] = await db
    .update(integrationHealthAlertsTable)
    .set({ status: "dismissed", dismissedAt: new Date() })
    .where(eq(integrationHealthAlertsTable.id, alertId))
    .returning();
  return updated ?? null;
}

// ---------------------------------------------------------------------------
// Email notification on health flip
// ---------------------------------------------------------------------------

async function notifyHealthFlip(
  input: ApplyIntegrationHealthTransitionInput,
): Promise<void> {
  // Collect unique email addresses for project owner and org owner.
  const emails = new Set<string>();

  const [projectOwner] = await db
    .select({ email: usersTable.email })
    .from(websiteProjectsTable)
    .innerJoin(usersTable, eq(websiteProjectsTable.userId, usersTable.id))
    .where(eq(websiteProjectsTable.id, input.websiteProjectId))
    .limit(1);
  if (projectOwner?.email) emails.add(projectOwner.email);

  if (input.organizationId) {
    const [orgOwner] = await db
      .select({ email: usersTable.email })
      .from(organizationsTable)
      .innerJoin(usersTable, eq(organizationsTable.ownerId, usersTable.id))
      .where(eq(organizationsTable.id, input.organizationId))
      .limit(1);
    if (orgOwner?.email) emails.add(orgOwner.email);
  }

  if (emails.size === 0) return;

  // Fetch project name for the email body.
  const [proj] = await db
    .select({ name: websiteProjectsTable.name })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, input.websiteProjectId))
    .limit(1);

  const projectName = proj?.name ?? `Project #${input.websiteProjectId}`;
  const errorSnippet = (input.error ?? "Unknown error").slice(0, 200);
  const appOrigin = resolveAppOrigin();
  const settingsUrl = `${appOrigin}/projects/${input.websiteProjectId}/settings/publishing`;

  await sendPlatformEmail({
    to: [...emails],
    subject: `Integration failing: ${input.platform} on ${projectName}`,
    html: `
      <h2>Integration health alert</h2>
      <p>The <strong>${input.platform}</strong> integration on <strong>${projectName}</strong> has started failing health checks.</p>
      <p style="color:#666;">${errorSnippet.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>
      <p><a href="${settingsUrl}">Open publishing settings</a></p>
    `,
  });
}
