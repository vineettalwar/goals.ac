import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentItemsTable, contentStrategiesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const PatchBody = z.object({
  status: z.enum(["draft", "prepared", "published"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const [item] = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, id))
      .limit(1);

    if (!item) return NextResponse.json({ error: "Content item not found" }, { status: 404 });

    // Verify access via strategy → project → user
    const [strategy] = await db
      .select()
      .from(contentStrategiesTable)
      .where(eq(contentStrategiesTable.id, item.strategyId))
      .limit(1);

    if (!strategy) return NextResponse.json({ error: "Content strategy not found" }, { status: 404 });

    if (strategy.websiteProjectId) {
      const [proj] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(and(eq(websiteProjectsTable.id, strategy.websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
        .limit(1);
      if (!proj) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [updated] = await db
      .update(contentItemsTable)
      .set({ status: parsed.data.status })
      .where(eq(contentItemsTable.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
