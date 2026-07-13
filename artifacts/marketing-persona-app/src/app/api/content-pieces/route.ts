import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/org-access";

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

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

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
