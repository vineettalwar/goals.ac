import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const [roadmap] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    await db
      .update(roadmapsTable)
      .set({ viewCount: (roadmap.viewCount ?? 0) + 1 })
      .where(eq(roadmapsTable.id, roadmap.id));

    return NextResponse.json({ ...roadmap, viewCount: (roadmap.viewCount ?? 0) + 1 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
