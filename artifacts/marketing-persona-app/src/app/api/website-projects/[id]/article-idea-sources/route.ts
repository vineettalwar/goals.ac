import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { articleIdeaSourcesTable } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import {
  parseSheetUrlOrId,
} from "@workspace/content-engine/articles/article-ideas-import-service";

const CreateSourceSchema = z.object({
  label: z.string().min(1),
  spreadsheetUrl: z.string().min(1),
  sheetName: z.string().optional(),
  sheetGid: z.string().optional(),
  columnMapping: z
    .object({
      keyword: z.string().optional(),
      title: z.string().optional(),
      angle: z.string().optional(),
      volume: z.string().optional(),
      intent: z.string().optional(),
      difficulty: z.string().optional(),
    })
    .optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const sources = await db
    .select({
      id: articleIdeaSourcesTable.id,
      label: articleIdeaSourcesTable.label,
      spreadsheetId: articleIdeaSourcesTable.spreadsheetId,
      sheetName: articleIdeaSourcesTable.sheetName,
      sheetGid: articleIdeaSourcesTable.sheetGid,
      lastSyncedAt: articleIdeaSourcesTable.lastSyncedAt,
      syncStatus: articleIdeaSourcesTable.syncStatus,
      rowCount: articleIdeaSourcesTable.rowCount,
      syncError: articleIdeaSourcesTable.syncError,
      connected: articleIdeaSourcesTable.encryptedConfig,
      createdAt: articleIdeaSourcesTable.createdAt,
    })
    .from(articleIdeaSourcesTable)
    .where(eq(articleIdeaSourcesTable.projectId, projectId));

  return NextResponse.json({
    sources: sources.map((s) => ({
      ...s,
      connected: Boolean(s.connected),
      lastSyncedAt: s.lastSyncedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const parsed = CreateSourceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let spreadsheet: { spreadsheetId: string; gid?: string };
  try {
    spreadsheet = parseSheetUrlOrId(parsed.data.spreadsheetUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid spreadsheet URL" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(articleIdeaSourcesTable)
    .values({
      projectId,
      type: "google_sheets",
      label: parsed.data.label,
      spreadsheetId: spreadsheet.spreadsheetId,
      sheetName: parsed.data.sheetName ?? null,
      sheetGid: parsed.data.sheetGid ?? spreadsheet.gid ?? null,
      columnMapping: parsed.data.columnMapping ?? null,
      syncStatus: "idle",
    })
    .returning();

  return NextResponse.json({
    source: created,
    connectUrl: `/api/auth/google-sheets?projectId=${projectId}&sourceId=${created!.id}`,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  const sourceId = Number(new URL(req.url).searchParams.get("sourceId"));
  if (isNaN(projectId) || isNaN(sourceId)) {
    return NextResponse.json({ error: "Invalid project or source id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await db
    .delete(articleIdeaSourcesTable)
    .where(
      and(
        eq(articleIdeaSourcesTable.id, sourceId),
        eq(articleIdeaSourcesTable.projectId, projectId),
      ),
    );

  return NextResponse.json({ ok: true });
}
