import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  contentPiecesTable,
  keywordRankSnapshotsTable,
  trackedKeywordsTable,
} from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { scoreDualContentQuality } from "@workspace/content-engine/articles/serp-content-score";
import { isSerpConfigured, getSerpProvider } from "@workspace/serp-provider";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const pieceId = Number(idStr);
  if (Number.isNaN(pieceId)) {
    return NextResponse.json({ error: "Invalid content piece id" }, { status: 400 });
  }

  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, pieceId))
    .limit(1);
  if (!piece) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await requireProjectAccess(piece.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const meta = (piece.pieceMetadata ?? {}) as {
    seoTitle?: string;
    metaTitle?: string;
    metaDescription?: string;
    citations?: { text: string; url: string }[];
    faqSection?: { question: string; answer: string }[];
    jsonLdSchema?: object;
    internalLinkSuggestions?: { anchorText: string; suggestedSlug: string }[];
  };

  let serpFeatures: Record<string, unknown> | null = null;
  const keyword = piece.targetKeyword?.trim();

  if (keyword) {
    const [tracked] = await db
      .select({ id: trackedKeywordsTable.id })
      .from(trackedKeywordsTable)
      .where(
        and(
          eq(trackedKeywordsTable.websiteProjectId, piece.websiteProjectId),
          eq(trackedKeywordsTable.keyword, keyword.toLowerCase()),
          eq(trackedKeywordsTable.isActive, true),
        ),
      )
      .limit(1);

    if (tracked) {
      const [snapshot] = await db
        .select({ serpFeatures: keywordRankSnapshotsTable.serpFeatures })
        .from(keywordRankSnapshotsTable)
        .where(eq(keywordRankSnapshotsTable.trackedKeywordId, tracked.id))
        .orderBy(desc(keywordRankSnapshotsTable.checkedAt))
        .limit(1);
      serpFeatures = (snapshot?.serpFeatures as Record<string, unknown>) ?? null;
    }

    if (!serpFeatures && isSerpConfigured()) {
      try {
        const result = await getSerpProvider().checkRank({ keyword });
        serpFeatures = result.serpFeatures;
      } catch {
        // SERP optional — fall back to editorial-only dual score
      }
    }
  }

  const peopleAlsoAsk = Array.isArray(serpFeatures?.peopleAlsoAsk)
    ? (serpFeatures.peopleAlsoAsk as string[]).filter((q) => typeof q === "string")
    : [];
  const competitorTitles = Array.isArray(serpFeatures?.topResults)
    ? (serpFeatures.topResults as Array<{ title?: string }>)
        .map((row) => row.title)
        .filter((title): title is string => Boolean(title))
    : [];

  const dual = scoreDualContentQuality({
    bodyMarkdown: piece.bodyMarkdown ?? "",
    wordCount: piece.wordCount ?? undefined,
    metaTitle: meta.seoTitle ?? meta.metaTitle ?? piece.title,
    metaDescription: meta.metaDescription,
    targetKeyword: keyword,
    citations: meta.citations,
    faqSection: meta.faqSection,
    jsonLdSchema: meta.jsonLdSchema,
    internalLinkSuggestions: meta.internalLinkSuggestions,
    serpFeatures,
    peopleAlsoAsk,
    competitorTitles,
  });

  return NextResponse.json({
    ...dual,
    serpFeatures,
    keyword: keyword ?? null,
  });
}
