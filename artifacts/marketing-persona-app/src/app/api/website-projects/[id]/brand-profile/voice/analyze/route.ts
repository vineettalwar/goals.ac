import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const AnalyzeWritingExamplesBody = z.object({
  writingExamples: z.array(z.string()).min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return Response.json({ error: "Invalid project id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = AnalyzeWritingExamplesBody.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(
      and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId!)),
    )
    .limit(1);

  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const { writingExamples } = parsed.data;
  const allText = writingExamples.join(" ").toLowerCase();
  const words: string[] = allText.match(/\b\w+\b/g) ?? [];

  const wordFreq: Record<string, number> = {};
  words.forEach((word) => {
    if (word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const sortedWords = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);

  const hasQuestions = writingExamples.some((text) => text.includes("?"));
  const hasColons = writingExamples.some((text) => text.includes(":"));
  const avgLength =
    writingExamples.reduce((sum, text) => sum + text.length, 0) / writingExamples.length;

  let suggestedStructure = "Hook → Insight → CTA";
  if (hasQuestions && hasColons) {
    suggestedStructure = "Question → Explanation → Example → CTA";
  } else if (hasQuestions) {
    suggestedStructure = "Question → Insight → CTA";
  } else if (avgLength > 200) {
    suggestedStructure = "Story → Lesson → Application";
  }

  return Response.json({
    suggestedGlossary: sortedWords,
    suggestedStructure,
    analysis: {
      totalExamples: writingExamples.length,
      averageLength: Math.round(avgLength),
      hasQuestions,
      hasColons,
      commonWords: sortedWords.slice(0, 5),
    },
  });
}
