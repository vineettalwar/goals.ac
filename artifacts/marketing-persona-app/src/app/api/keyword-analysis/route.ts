import { NextResponse } from "next/server";
import { db, keywordAnalysesTable } from "@workspace/db";
import { analyzeKeywords } from "@workspace/seo-tools/keywordAnalyzer";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";
import { loadUserAiSettings } from "@/lib/content-pieces-helpers";
import { z } from "zod";

const KeywordAnalysisBody = z.object({
  keywords: z.array(z.string().min(1).max(200)).min(1).max(10),
  websiteUrl: z.string().url().optional(),
  websiteProjectId: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = KeywordAnalysisBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  if (parsed.data.websiteProjectId) {
    const access = await requireProjectAccess(parsed.data.websiteProjectId, userId!);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
  const analysis = await analyzeKeywords({
    keywords: parsed.data.keywords,
    websiteUrl: parsed.data.websiteUrl,
    userApiKey,
    aiProviderOptions,
  });

  const [saved] = await db
    .insert(keywordAnalysesTable)
    .values({
      websiteProjectId: parsed.data.websiteProjectId ?? null,
      keywords: parsed.data.keywords,
      websiteUrl: parsed.data.websiteUrl ?? null,
      result: analysis,
    })
    .returning();

  return NextResponse.json({ id: saved.id, ...analysis }, { status: 201 });
}
