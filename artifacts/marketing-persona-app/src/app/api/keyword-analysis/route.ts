import { NextResponse } from "next/server";
import { db, keywordAnalysesTable } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { analyzeKeywords } from "@workspace/seo-tools/keywordAnalyzer";
import { getDecryptedSemrushCredentialsForUser } from "@workspace/content-engine/support/org-ai-settings";
import { buildLanguagePromptLine } from "@workspace/content-engine/support/content-language";
import type { ContentStyle } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
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

  let contentLanguage: string | undefined;
  if (parsed.data.websiteProjectId) {
    const [project] = await db
      .select({ contentStyle: websiteProjectsTable.contentStyle })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, parsed.data.websiteProjectId))
      .limit(1);
    contentLanguage = (project?.contentStyle as ContentStyle | null)?.primaryLanguage;
  }

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "planning",
    quotaKind: "article",
    usedByok: Boolean(userApiKey),
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const semrushCredentials = await getDecryptedSemrushCredentialsForUser(userId!);
    const analysis = await analyzeKeywords({
      keywords: parsed.data.keywords,
      websiteUrl: parsed.data.websiteUrl,
      userApiKey,
      aiProviderOptions,
      semrushCredentials,
      languagePromptLine: buildLanguagePromptLine(contentLanguage),
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

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "keyword_analysis",
      usedByok: billingPrep.usedByok,
      tier: "planning",
    });

    return NextResponse.json({ id: saved.id, ...analysis }, { status: 201 });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "analysis_failed");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Keyword analysis failed" },
      { status: 500 },
    );
  }
}
