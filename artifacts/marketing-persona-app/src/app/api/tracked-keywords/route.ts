import { NextResponse } from "next/server";
import { db, trackedKeywordsTable, keywordRankSnapshotsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";
import { isSerpConfigured } from "@workspace/serp-provider";
import { enqueue, QUEUES } from "@workspace/jobs";
import { z } from "zod";

const CreateBody = z.object({
  websiteProjectId: z.number().int().positive(),
  keyword: z.string().min(1).max(200),
  targetUrl: z.string().url().optional(),
  location: z.string().min(1).optional(),
  language: z.string().min(2).max(10).optional(),
  device: z.enum(["desktop", "mobile"]).optional(),
});

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number(new URL(req.url).searchParams.get("projectId"));
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "projectId query parameter is required" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const keywords = await db
    .select()
    .from(trackedKeywordsTable)
    .where(
      and(
        eq(trackedKeywordsTable.websiteProjectId, projectId),
        eq(trackedKeywordsTable.isActive, true),
      ),
    )
    .orderBy(desc(trackedKeywordsTable.createdAt));

  const withLatest = await Promise.all(
    keywords.map(async (kw) => {
      const [latest] = await db
        .select()
        .from(keywordRankSnapshotsTable)
        .where(eq(keywordRankSnapshotsTable.trackedKeywordId, kw.id))
        .orderBy(desc(keywordRankSnapshotsTable.checkedAt))
        .limit(1);
      return { ...kw, latestSnapshot: latest ?? null };
    }),
  );

  return NextResponse.json({ keywords: withLatest, trackedKeywords: withLatest });
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  if (!isSerpConfigured()) {
    return NextResponse.json(
      { error: "Rank tracking is not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const access = await requireProjectAccess(parsed.data.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [row] = await db
    .insert(trackedKeywordsTable)
    .values({
      websiteProjectId: parsed.data.websiteProjectId,
      keyword: parsed.data.keyword.trim().toLowerCase(),
      targetUrl: parsed.data.targetUrl ?? null,
      location: parsed.data.location ?? "United States",
      language: parsed.data.language ?? "en",
      device: parsed.data.device ?? "desktop",
    })
    .returning();

  await enqueue(QUEUES.keywordRankCheck, { trackedKeywordId: row.id });

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (isNaN(id)) return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });

  const [row] = await db.select().from(trackedKeywordsTable).where(eq(trackedKeywordsTable.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await requireProjectAccess(row.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(keywordRankSnapshotsTable).where(eq(keywordRankSnapshotsTable.trackedKeywordId, id));
  await db.delete(trackedKeywordsTable).where(eq(trackedKeywordsTable.id, id));

  return NextResponse.json({ ok: true });
}
