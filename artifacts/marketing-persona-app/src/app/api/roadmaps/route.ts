import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { and, desc, count, ilike } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
    const offset = Number(searchParams.get("offset") ?? "0");
    const industry = searchParams.get("industry") ?? undefined;
    const location = searchParams.get("location") ?? undefined;

    const conditions = [];
    if (industry) conditions.push(ilike(roadmapsTable.industry, `%${industry}%`));
    if (location) conditions.push(ilike(roadmapsTable.location, `%${location}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [roadmaps, totalResult] = await Promise.all([
      db
        .select({
          id: roadmapsTable.id,
          slug: roadmapsTable.slug,
          industry: roadmapsTable.industry,
          location: roadmapsTable.location,
          stage: roadmapsTable.stage,
          viewCount: roadmapsTable.viewCount,
          createdAt: roadmapsTable.createdAt,
        })
        .from(roadmapsTable)
        .where(where)
        .orderBy(desc(roadmapsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(roadmapsTable).where(where),
    ]);

    return NextResponse.json({
      roadmaps,
      total: totalResult[0]?.count ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to list roadmaps" }, { status: 500 });
  }
}
