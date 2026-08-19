import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";

import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { sendEmail } from "@/lib/utils/email";
import { getAppOrigin } from "@/lib/marketing/site/app-url";
import { getPublishReliabilityWindow } from "@/lib/admin/publish-reliability";

export async function POST(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = (await req.json().catch(() => ({}))) as { windowHours?: number };
  const windowHours = body.windowHours ?? 24;

  const window = await getPublishReliabilityWindow({
    windowHours,
    failedRecordsLimit: 5,
    includeBackgroundJobFailures: false,
  });

  if (window.failedPublishRecordsCount <= 0) {
    return NextResponse.json({ sent: false, reason: "no_failures_in_window" });
  }

  const recipients = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.role, "super_admin"));

  if (recipients.length === 0) {
    return NextResponse.json({ sent: false, reason: "no_super_admin_recipients" });
  }

  const adminHref = `${getAppOrigin()}/admin/publish-reliability`;
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
    try {
      const res = await sendEmail({ to: r.email, subject, html });
      if (res.sent) sentAny = true;
    } catch {
      // Best-effort: keep trying other recipients.
    }
  }

  return NextResponse.json({
    sent: sentAny,
    reason: sentAny ? undefined : "email_delivery_not_configured_or_failed",
  });
}

