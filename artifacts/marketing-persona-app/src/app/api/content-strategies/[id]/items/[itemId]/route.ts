import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentStrategiesTable, contentItemsTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/org-access";
import { z } from "zod";

const UpdateItemStatusBody = z.object({
  status: z.enum(["draft", "prepared", "published"]),
});

async function assertStrategyAccess(strategyId: number, userId: number) {
  const [strategy] = await db
    .select()
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.id, strategyId))
    .limit(1);

  if (!strategy) return { error: "not_found" as const };

  if (strategy.websiteProjectId) {
    const access = await requireProjectAccess(strategy.websiteProjectId, userId);
    if (!access.ok) return { error: "forbidden" as const };
  } else {
    const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user?.role !== "admin" && user?.role !== "super_admin") return { error: "forbidden" as const };
  }

  return { strategy };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const strategyId = Number((await params).id);
  const itemId = Number((await params).itemId);
  if (isNaN(strategyId) || isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateItemStatusBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const access = await assertStrategyAccess(strategyId, userId!);
  if (access.error === "not_found") return NextResponse.json({ error: "Content strategy not found" }, { status: 404 });
  if (access.error === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const [item] = await db
    .select()
    .from(contentItemsTable)
    .where(and(eq(contentItemsTable.id, itemId), eq(contentItemsTable.strategyId, strategyId)))
    .limit(1);

  if (!item) return NextResponse.json({ error: "Content item not found" }, { status: 404 });

  const [updated] = await db
    .update(contentItemsTable)
    .set({ status: parsed.data.status })
    .where(eq(contentItemsTable.id, itemId))
    .returning();

  return NextResponse.json(updated);
}
