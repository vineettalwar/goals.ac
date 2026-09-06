import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  siteAuditsTable,
  websiteProjectsTable,
} from "@workspace/db";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { enqueue, QUEUES, JobsUnavailableError, processSiteAuditCrawl } from "@workspace/jobs";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { normalizeHttpUrl } from "@/lib/utils/normalize-url";

const CreateBody = z.object({
  startUrl: z.string().min(1).optional(),
  maxPages: z.coerce.number().int().min(1).max(100).optional(),
  /** Run crawl in this request instead of queueing (useful when worker is down). */
  sync: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const audits = await db
    .select({
      id: siteAuditsTable.id,
      startUrl: siteAuditsTable.startUrl,
      status: siteAuditsTable.status,
      maxPages: siteAuditsTable.maxPages,
      pagesCrawled: siteAuditsTable.pagesCrawled,
      crawlComplete: siteAuditsTable.crawlComplete,
      errorMessage: siteAuditsTable.errorMessage,
      createdAt: siteAuditsTable.createdAt,
      completedAt: siteAuditsTable.completedAt,
    })
    .from(siteAuditsTable)
    .where(eq(siteAuditsTable.websiteProjectId, projectId))
    .orderBy(desc(siteAuditsTable.createdAt))
    .limit(20);

  return NextResponse.json({ audits });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const [project] = await db
    .select({ url: websiteProjectsTable.url })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const startUrl = normalizeHttpUrl(parsed.data.startUrl ?? project.url);
  try {
    await assertPublicUrl(startUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid URL" },
      { status: 422 },
    );
  }

  const maxPages = parsed.data.maxPages ?? 50;
  const [audit] = await db
    .insert(siteAuditsTable)
    .values({
      websiteProjectId: projectId,
      startUrl,
      status: "pending",
      maxPages,
    })
    .returning();

  if (!audit) {
    return NextResponse.json({ error: "Failed to create audit" }, { status: 500 });
  }

  const runSync = async () => {
    await processSiteAuditCrawl({ siteAuditId: audit.id });
    const [fresh] = await db
      .select()
      .from(siteAuditsTable)
      .where(eq(siteAuditsTable.id, audit.id))
      .limit(1);
    return fresh ?? audit;
  };

  if (parsed.data.sync) {
    try {
      const fresh = await runSync();
      return NextResponse.json(fresh, { status: 201 });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Site audit failed", id: audit.id },
        { status: 502 },
      );
    }
  }

  try {
    await enqueue(QUEUES.siteAuditCrawl, { siteAuditId: audit.id });
    return NextResponse.json({ ...audit, queued: true }, { status: 202 });
  } catch (err) {
    if (err instanceof JobsUnavailableError) {
      const fresh = await runSync();
      return NextResponse.json(fresh, { status: 201 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to queue site audit", id: audit.id },
      { status: 502 },
    );
  }
}
