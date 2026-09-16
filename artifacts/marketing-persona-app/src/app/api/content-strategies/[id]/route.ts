import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentStrategiesTable, contentItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireBoundProjectAccess } from "@/lib/org/org-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid strategy id" }, { status: 400 });

  try {
    const [strategy] = await db
      .select()
      .from(contentStrategiesTable)
      .where(eq(contentStrategiesTable.id, id))
      .limit(1);

    if (!strategy) return NextResponse.json({ error: "Content strategy not found" }, { status: 404 });

    const access = await requireBoundProjectAccess(strategy.websiteProjectId, userId!);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const items = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.strategyId, id))
      .orderBy(contentItemsTable.day);

    return NextResponse.json({ ...strategy, items });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
