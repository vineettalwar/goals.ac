import { NextResponse } from "next/server";
import { db, trackedKeywordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid tracked keyword id" }, { status: 400 });

  const [kw] = await db.select().from(trackedKeywordsTable).where(eq(trackedKeywordsTable.id, id)).limit(1);
  if (!kw) return NextResponse.json({ error: "Tracked keyword not found" }, { status: 404 });

  const access = await requireProjectAccess(kw.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db
    .update(trackedKeywordsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(trackedKeywordsTable.id, id));

  return new NextResponse(null, { status: 204 });
}
