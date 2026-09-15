import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { agentRunsTable } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const runId = Number((await params).id);
  if (isNaN(runId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [run] = await db.select().from(agentRunsTable).where(eq(agentRunsTable.id, runId)).limit(1);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await requireProjectAccess(run.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  return NextResponse.json({ run });
}
