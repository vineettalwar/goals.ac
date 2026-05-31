import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { geoAuditsTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid audit id" }, { status: 400 });

  try {
    const [audit] = await db
      .select()
      .from(geoAuditsTable)
      .where(eq(geoAuditsTable.id, id))
      .limit(1);

    if (!audit) return NextResponse.json({ error: "GEO audit not found" }, { status: 404 });

    if (audit.websiteProjectId) {
      const [proj] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(and(eq(websiteProjectsTable.id, audit.websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
        .limit(1);
      if (!proj) return NextResponse.json({ error: "You do not have access to this audit" }, { status: 403 });
    }

    return NextResponse.json(audit);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
