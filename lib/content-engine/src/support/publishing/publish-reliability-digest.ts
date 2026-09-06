import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import {
  getPublishReliabilityWindow,
  type PublishReliabilityWindowResult,
} from "./publish-reliability";
import { sendPlatformEmail, resolveAppOrigin } from "../email/send-platform-email";
import { logger } from "../../core/logger";

export interface PublishReliabilityDigestOptions {
  windowHours?: number;
}

/**
 * Sends a publish-reliability digest email to all super_admins.
 * Returns `{ sent: boolean; reason?: string }`.
 * Never throws — logs and returns on failure.
 */
export async function sendPublishReliabilityDigest(
  opts?: PublishReliabilityDigestOptions,
): Promise<{ sent: boolean; reason?: string }> {
  const windowHours = opts?.windowHours ?? 24;

  let window: PublishReliabilityWindowResult;
  try {
    window = await getPublishReliabilityWindow({
      windowHours,
      failedRecordsLimit: 5,
      includeBackgroundJobFailures: false,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch publish reliability window for digest");
    return { sent: false, reason: "query_failed" };
  }

  if (window.failedPublishRecordsCount <= 0) {
    return { sent: false, reason: "no_failures_in_window" };
  }

  const recipients = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.role, "super_admin"));

  if (recipients.length === 0) {
    return { sent: false, reason: "no_super_admin_recipients" };
  }

  const appOrigin = resolveAppOrigin();
  const adminHref = `${appOrigin}/admin/publish-reliability`;
  const pilotLabel = window.pilotOrganizationIdsConfigured
    ? `Pilot orgs: ${window.pilotOrganizationIds.join(", ")}`
    : "Pilot org filter not set (showing all orgs)";

  const listItems = window.failedPublishRecords
    .map((r) => {
      const piece = r.pieceTitle ?? "Untitled";
      const err = r.errorMessage ?? "Unknown error";
      const errSafe = err.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      return `<li><strong>${r.provider}</strong> · ${r.websiteProjectName} · ${piece}<br/><span style="color:#666;">${errSafe}</span></li>`;
    })
    .join("");

  const subject = `Publish reliability alert: ${window.failedPublishRecordsCount} failed publish record(s)`;
  const html = `
    <h2>Publish reliability alert</h2>
    <p><strong>Window:</strong> last ${windowHours} hours</p>
    <p><strong>Failed publish_records:</strong> ${window.failedPublishRecordsCount}</p>
    <p><strong>${pilotLabel}</strong></p>
    <p><a href="${adminHref}">Open publish reliability dashboard</a></p>
    <h3>Most recent failures</h3>
    <ul>${listItems}</ul>
  `;

  let sentAny = false;
  for (const r of recipients) {
    const result = await sendPlatformEmail({ to: r.email, subject, html });
    if (result.sent) sentAny = true;
  }

  return {
    sent: sentAny,
    reason: sentAny ? undefined : "email_delivery_not_configured_or_failed",
  };
}
