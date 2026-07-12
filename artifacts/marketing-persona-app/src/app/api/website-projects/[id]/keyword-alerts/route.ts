import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { keywordRankAlertsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const alerts = await db
    .select()
    .from(keywordRankAlertsTable)
    .where(
      and(
        eq(keywordRankAlertsTable.websiteProjectId, projectId),
        eq(keywordRankAlertsTable.status, "open"),
      ),
    )
    .orderBy(desc(keywordRankAlertsTable.createdAt));

  return NextResponse.json({ alerts });
}
