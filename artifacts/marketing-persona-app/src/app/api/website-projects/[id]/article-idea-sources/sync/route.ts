import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { articleIdeaSourcesTable } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { syncArticleIdeaSource } from "@workspace/content-engine/articles/article-ideas-import-service";
import { enqueue, QUEUES } from "@workspace/jobs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  const body = await req.json().catch(() => ({}));
  const sourceId = Number(body?.sourceId);
  if (isNaN(projectId) || isNaN(sourceId)) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [source] = await db
    .select()
    .from(articleIdeaSourcesTable)
    .where(
      and(
        eq(articleIdeaSourcesTable.id, sourceId),
        eq(articleIdeaSourcesTable.projectId, projectId),
      ),
    )
    .limit(1);

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (!source.encryptedConfig) {
    return NextResponse.json(
      {
        error: "Connect Google account first",
        connectUrl: `/api/auth/google-sheets?projectId=${projectId}&sourceId=${sourceId}`,
      },
      { status: 400 },
    );
  }

  if (body?.async === true) {
    await enqueue(QUEUES.articleIdeaSourceSync, { sourceId, userId: userId! });
    return NextResponse.json({ queued: true }, { status: 202 });
  }

  try {
    const inserted = await syncArticleIdeaSource(sourceId, userId!);
    return NextResponse.json({ inserted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 502 },
    );
  }
}
