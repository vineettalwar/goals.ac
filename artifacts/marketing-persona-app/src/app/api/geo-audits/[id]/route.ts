import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { geoAuditsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";

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
      const access = await requireProjectAccess(audit.websiteProjectId, userId!);
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json(audit);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
