import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateRoadmap, generateSlug } from "@/lib/ai/roadmap-generator";
import { z } from "zod";

const GenerateRoadmapBody = z.object({
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = GenerateRoadmapBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request: " + parsed.error.message }, { status: 400 });
  }

  const { industry, location, stage } = parsed.data;

  try {
    const slug = generateSlug(industry, location, stage);

    const existing = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(existing[0]);
    }

    let content;
    try {
      content = await generateRoadmap(industry, location, stage);
    } catch (err) {
      return NextResponse.json(
        { error: "Roadmap generation temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }

    const [inserted] = await db
      .insert(roadmapsTable)
      .values({ slug, industry, location, stage, content })
      .onConflictDoNothing({ target: roadmapsTable.slug })
      .returning();

    if (inserted) {
      return NextResponse.json(inserted);
    }

    const [race] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    return NextResponse.json(race);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
