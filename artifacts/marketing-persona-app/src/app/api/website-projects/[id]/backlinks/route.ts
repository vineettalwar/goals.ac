import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, websiteProjectsTable } from "@workspace/db";
import {
  isBacklinksConfigured,
  fetchBacklinksOverview,
} from "@workspace/serp-provider";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";

export async function POST(
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

  if (!isBacklinksConfigured()) {
    return NextResponse.json(
      { error: "Backlinks provider not configured — add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD", configured: false },
      { status: 503 },
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

  const overview = await fetchBacklinksOverview({ target: project.url });
  return NextResponse.json(overview);
}
