import { NextResponse } from "next/server";
import { db, keywordRankAlertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { z } from "zod";

const UpdateAlertBody = z.object({
  status: z.enum(["open", "dismissed", "actioned"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const alertId = Number((await params).id);
  if (isNaN(alertId)) return NextResponse.json({ error: "Invalid alert id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateAlertBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [alert] = await db
    .select()
    .from(keywordRankAlertsTable)
    .where(eq(keywordRankAlertsTable.id, alertId))
    .limit(1);

  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  const access = await requireProjectAccess(alert.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [updated] = await db
    .update(keywordRankAlertsTable)
    .set({ status: parsed.data.status })
    .where(eq(keywordRankAlertsTable.id, alertId))
    .returning();

  return NextResponse.json(updated);
}
