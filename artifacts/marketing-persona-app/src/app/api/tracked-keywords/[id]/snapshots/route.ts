import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { trackedKeywordsTable, keywordRankSnapshotsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
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
  if (isNaN(id)) return NextResponse.json({ error: "Invalid tracked keyword id" }, { status: 400 });

  const [kw] = await db
    .select()
    .from(trackedKeywordsTable)
    .where(eq(trackedKeywordsTable.id, id))
    .limit(1);

  if (!kw) return NextResponse.json({ error: "Tracked keyword not found" }, { status: 404 });

  const access = await requireProjectAccess(kw.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const snapshots = await db
    .select()
    .from(keywordRankSnapshotsTable)
    .where(eq(keywordRankSnapshotsTable.trackedKeywordId, id))
    .orderBy(desc(keywordRankSnapshotsTable.checkedAt));

  return NextResponse.json({ trackedKeyword: kw, snapshots });
}
