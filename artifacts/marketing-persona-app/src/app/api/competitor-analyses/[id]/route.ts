import { NextResponse } from "next/server";
import { db, competitorAnalysesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid analysis id" }, { status: 400 });

  const [row] = await db
    .select()
    .from(competitorAnalysesTable)
    .where(eq(competitorAnalysesTable.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Competitor analysis not found" }, { status: 404 });

  if (row.websiteProjectId) {
    const access = await requireProjectAccess(row.websiteProjectId, userId!);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json({ id: row.id, ...row.result, createdAt: row.createdAt });
}
