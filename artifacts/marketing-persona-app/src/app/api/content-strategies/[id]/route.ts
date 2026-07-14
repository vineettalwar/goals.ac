import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@workspace/db";
import { contentStrategiesTable, contentItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/org/org-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    if (strategy.websiteProjectId) {
      const session = await auth();
      const userId = session?.user?.id ? parseInt(session.user.id, 10) : null;
      if (!userId) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      const access = await requireProjectAccess(strategy.websiteProjectId, userId);
      if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
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
