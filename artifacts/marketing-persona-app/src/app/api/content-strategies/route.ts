import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentStrategiesTable, usersTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  if (user?.role !== "admin" && user?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roadmapIdParam = new URL(req.url).searchParams.get("roadmapId");
  const roadmapId = roadmapIdParam ? Number(roadmapIdParam) : null;

  const strategies = roadmapId && !Number.isNaN(roadmapId)
    ? await db.select().from(contentStrategiesTable).where(eq(contentStrategiesTable.roadmapId, roadmapId)).orderBy(desc(contentStrategiesTable.createdAt))
    : await db.select().from(contentStrategiesTable).orderBy(desc(contentStrategiesTable.createdAt));

  return NextResponse.json(strategies);
}
