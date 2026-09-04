import { NextResponse } from "next/server";
import { db, integrationHealthAlertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { dismissIntegrationHealthAlert } from "@workspace/content-engine/support/publishing/integration-health-alerts";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; alertId: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr, alertId: alertIdStr } = await params;
  const projectId = Number(idStr);
  const alertId = Number(alertIdStr);
  if (Number.isNaN(projectId) || Number.isNaN(alertId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [alert] = await db
    .select({ id: integrationHealthAlertsTable.id, websiteProjectId: integrationHealthAlertsTable.websiteProjectId })
    .from(integrationHealthAlertsTable)
    .where(eq(integrationHealthAlertsTable.id, alertId))
    .limit(1);

  if (!alert || alert.websiteProjectId !== projectId) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const updated = await dismissIntegrationHealthAlert(alertId);
  return NextResponse.json({ alert: updated });
}
