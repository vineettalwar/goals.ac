import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateRoadmapStream, generateSlug } from "@/lib/ai/roadmap-generator";
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
    return new Response(
      JSON.stringify({ error: "Invalid request: " + parsed.error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { industry, location, stage } = parsed.data;

  const sseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };

  const slug = generateSlug(industry, location, stage);

  // Check for cached roadmap
  const existing = await db
    .select()
    .from(roadmapsTable)
    .where(eq(roadmapsTable.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event: "cached", ...existing[0] })}\n\n`),
        );
        controller.close();
      },
    });
    return new Response(stream, { headers: sseHeaders });
  }

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        function send(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ event, ...data as object })}\n\n`),
          );
        }

        try {
          let content;
          try {
            content = await generateRoadmapStream(industry, location, stage, (event, data) => {
              send(event, data as object);
            });
          } catch (err) {
            send("error", { error: "Roadmap generation temporarily unavailable. Please try again shortly." });
            controller.close();
            return;
          }

          const [inserted] = await db
            .insert(roadmapsTable)
            .values({ slug, industry, location, stage, content })
            .onConflictDoNothing({ target: roadmapsTable.slug })
            .returning();

          const finalRoadmap = inserted ??
            (await db.select().from(roadmapsTable).where(eq(roadmapsTable.slug, slug)).limit(1))[0];

          send("done", finalRoadmap);
          controller.close();
        } catch (err) {
          try {
            const encoder2 = new TextEncoder();
            controller.enqueue(
              encoder2.encode(`data: ${JSON.stringify({ event: "error", error: "Internal server error" })}\n\n`),
            );
          } catch { /* closed */ }
          controller.close();
        }
      },
    }),
    { headers: sseHeaders },
  );
}
