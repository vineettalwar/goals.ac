import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@workspace/db";
import { contentStrategiesTable, contentItemsTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

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

      const [proj] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, strategy.websiteProjectId),
            eq(websiteProjectsTable.userId, userId),
          ),
        )
        .limit(1);
      if (!proj) {
        return NextResponse.json({ error: "You do not have access to this content strategy" }, { status: 403 });
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
