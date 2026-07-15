import { NextResponse } from "next/server";
import { db, geoAuditsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "Invalid audit id" }, { status: 400 });
  }

  try {
    const [audit] = await db
      .select()
      .from(geoAuditsTable)
      .where(and(eq(geoAuditsTable.id, id), isNull(geoAuditsTable.websiteProjectId)))
      .limit(1);

    if (!audit) {
      return NextResponse.json({ error: "GEO audit not found" }, { status: 404 });
    }

    return NextResponse.json(audit);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
