import { NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, gscUrlInspectionsTable } from "@workspace/db";
import { enqueue, QUEUES, JobsUnavailableError } from "@workspace/jobs";
import { inspectPublishedUrl } from "@workspace/content-engine/analytics/gsc-url-inspection-service";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { wasRecentlyInspected } from "@/lib/gsc/rate-limit";

const CreateBody = z.object({
  url: z.string().url(),
  contentPieceId: z.number().int().positive().optional(),
  publishRecordId: z.number().int().positive().optional(),
  async: z.boolean().optional().default(true),
});

export async function GET(
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

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  const contentPieceId = url.searchParams.get("contentPieceId");

  const conditions = [eq(gscUrlInspectionsTable.websiteProjectId, projectId)];
  if (contentPieceId) {
    const cpId = Number(contentPieceId);
    if (!Number.isNaN(cpId)) {
      conditions.push(eq(gscUrlInspectionsTable.contentPieceId, cpId));
    }
  }

  const rows = await db
    .select()
    .from(gscUrlInspectionsTable)
    .where(and(...conditions))
    .orderBy(desc(gscUrlInspectionsTable.inspectedAt))
    .limit(limit);

  return NextResponse.json({ inspections: rows });
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

  const { url: inspectionUrl, contentPieceId, publishRecordId } = parsed.data;

  if (await wasRecentlyInspected(projectId, inspectionUrl)) {
    return NextResponse.json({ skipped: true, reason: "Inspected within the last 60 minutes" });
  }

  const runInline = async () => {
    const result = await inspectPublishedUrl({
      projectId,
      inspectionUrl,
      contentPieceId,
      publishRecordId,
    });
    return NextResponse.json(result, { status: 201 });
  };

  if (!parsed.data.async) {
    try {
      return await runInline();
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Inspection failed" },
        { status: 502 },
      );
    }
  }

  try {
    await enqueue(QUEUES.gscUrlInspection, {
      projectId,
      inspectionUrl,
      contentPieceId,
      publishRecordId,
    });
    return NextResponse.json({ queued: true }, { status: 202 });
  } catch (err) {
    if (err instanceof JobsUnavailableError) {
      try {
        return await runInline();
      } catch (inlineErr) {
        return NextResponse.json(
          { error: inlineErr instanceof Error ? inlineErr.message : "Inspection failed" },
          { status: 502 },
        );
      }
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to queue inspection" },
      { status: 502 },
    );
  }
}
