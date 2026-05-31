import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { roadmapsTable, leadCapturesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const CaptureLeadBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  companyUrl: z.string().url().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const body = await req.json().catch(() => null);
  const parsed = CaptureLeadBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request: " + parsed.error.message }, { status: 400 });
  }

  const { name, email, companyUrl } = parsed.data;
  const { slug } = await params;

  try {
    const [roadmap] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const roadmapId = roadmap.id;

    const existing = await db
      .select()
      .from(leadCapturesTable)
      .where(and(eq(leadCapturesTable.roadmapId, roadmapId), eq(leadCapturesTable.email, email)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ id: existing[0].id, message: "Lead already captured" }, { status: 201 });
    }

    const [lead] = await db
      .insert(leadCapturesTable)
      .values({ roadmapId, name, email, companyUrl: companyUrl ?? "" })
      .returning({ id: leadCapturesTable.id });

    return NextResponse.json({ id: lead.id, message: "Lead captured successfully" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
