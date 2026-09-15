import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import { agentActionItemsTable } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";

const Body = z.object({
  status: z.enum(["open", "approved", "dismissed", "blocked"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; actionId: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr, actionId: actionIdStr } = await params;
  const projectId = Number(idStr);
  const actionId = Number(actionIdStr);
  if (isNaN(projectId) || isNaN(actionId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(agentActionItemsTable)
    .where(eq(agentActionItemsTable.id, actionId))
    .limit(1);
  if (!existing || existing.websiteProjectId !== projectId) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  const [item] = await db
    .update(agentActionItemsTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(agentActionItemsTable.id, actionId))
    .returning();

  return NextResponse.json({ item });
}
