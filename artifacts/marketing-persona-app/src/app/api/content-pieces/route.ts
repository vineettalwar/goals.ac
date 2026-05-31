import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const websiteProjectId = searchParams.get("websiteProjectId");

  if (!websiteProjectId) {
    return NextResponse.json({ error: "websiteProjectId is required" }, { status: 400 });
  }

  const projectId = parseInt(websiteProjectId, 10);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid websiteProjectId" }, { status: 400 });

  // Verify ownership
  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId!)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  try {
    const pieces = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.websiteProjectId, projectId))
      .orderBy(desc(contentPiecesTable.createdAt));

    return NextResponse.json({ pieces });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
