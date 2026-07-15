import { useEffect, useState } from "react";
import { scoreArticleQuality } from "@workspace/content-engine/article-quality-score";
import { ScoreRing } from "../section-panels/shared";
import type { ContentPieceMetadata } from "./types";

export type DualContentScore = {
  editorial: { total: number; breakdown: Array<{ label: string; score: number; max: number }> };
  serp: {
    total: number;
    breakdown: Array<{ label: string; score: number; max: number; detail: string }>;
    gaps: string[];
  };
  combined: number;
  publishReady: boolean;
  competitorDiff?: Array<{ title: string; covered: boolean; overlap: number }>;
};

type ArticleQualityPanelProps = {
  bodyMarkdown: string;
  wordCount?: number;
  metadata?: ContentPieceMetadata | null;
  contentPieceId?: number | null;
  /** Host fetches `/api/content-pieces/:id/serp-score` (JWT or cookie). */
  fetchDualScore?: (contentPieceId: number) => Promise<DualContentScore | null>;
  onEnhance?: () => void;
  enhancing?: boolean;
  canEnhance?: boolean;
};

export function ArticleQualityPanel({
  bodyMarkdown,
  wordCount,
  metadata,
  contentPieceId,
  fetchDualScore,
  onEnhance,
  enhancing = false,
  canEnhance = false,
}: ArticleQualityPanelProps) {
  const result = scoreArticleQuality({
    bodyMarkdown,
    wordCount,
    metaTitle: metadata?.seoTitle ?? metadata?.metaTitle ?? null,
    metaDescription: metadata?.metaDescription ?? null,
    citations: metadata?.citations,
    faqSection: metadata?.faqSection,
    jsonLdSchema: metadata?.jsonLdSchema,
    internalLinkSuggestions: metadata?.internalLinkSuggestions,
  });
  const [dual, setDual] = useState<DualContentScore | null>(null);

  useEffect(() => {
    if (!contentPieceId || !fetchDualScore) {
      setDual(null);
      return;
    }
    let cancelled = false;
    void fetchDualScore(contentPieceId)
      .then((data) => {
        if (!cancelled) setDual(data);
      })
      .catch(() => {
        if (!cancelled) setDual(null);
      });
    return () => {
      cancelled = true;
    };
  }, [contentPieceId, fetchDualScore, bodyMarkdown, wordCount]);

  const displayTotal = dual?.combined ?? result.total;
  const needsEnhance = displayTotal < 80;
  const editorialTotal = dual?.editorial.total ?? result.total;
  const serpTotal = dual?.serp.total;

  return (
    <div className="paper-card space-y-4 rounded-xl p-5">
      <div className="flex items-center gap-4">
        <ScoreRing score={displayTotal} size="md" />
        <div>
          <h3 className="text-sm font-semibold">Quality breakdown</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {dual?.publishReady
              ? "Publish-ready (editorial + SERP)"
              : displayTotal >= 80
                ? "Publish-ready"
                : displayTotal >= 60
                  ? "Needs polish"
                  : "Improve before publishing"}
          </p>
          {dual ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Editorial {editorialTotal} · SERP {serpTotal} · Combined {dual.combined}
            </p>
          ) : null}
        </div>
      </div>
      <ul className="space-y-2">
        {(dual?.editorial.breakdown ?? result.breakdown).map((item) => (
          <li key={item.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={item.score === 0 ? "font-medium text-red-600" : "font-medium"}>
              {item.score}/{item.max}
            </span>
          </li>
        ))}
      </ul>

      {dual?.serp.breakdown?.length ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            SERP coverage
          </p>
          {dual.serp.breakdown.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground" title={item.detail}>
                {item.label}
              </span>
              <span className="font-medium">
                {item.score}/{item.max}
              </span>
            </div>
          ))}
          {dual.serp.gaps.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {dual.serp.gaps.slice(0, 4).map((gap) => (
                <li key={gap}>• {gap}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {dual?.competitorDiff && dual.competitorDiff.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Competitor topics (top SERP)
          </p>
          <ul className="space-y-1.5">
            {dual.competitorDiff.map((row) => (
              <li key={row.title} className="flex items-start justify-between gap-2 text-xs">
                <span className={row.covered ? "text-muted-foreground" : ""}>{row.title}</span>
                <span
                  className={
                    row.covered
                      ? "shrink-0 font-medium text-emerald-700"
                      : "shrink-0 font-medium text-amber-700"
                  }
                >
                  {row.covered ? "Covered" : "Missing"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canEnhance && needsEnhance && onEnhance ? (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            {dual?.serp.gaps.length
              ? "Fix gaps runs an enhance pass targeting SERP, FAQ, citations, and internal links."
              : "Missing FAQ, citations, or SERP angles? Enhance adds them without rewriting from scratch."}
          </p>
          <button
            type="button"
            className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
            onClick={onEnhance}
            disabled={enhancing}
          >
            {enhancing
              ? "Fixing gaps…"
              : dual?.serp.gaps.length
                ? "Fix gaps"
                : "Enhance quality"}
          </button>
        </div>
      ) : null}

      {(metadata?.seoTitle || metadata?.metaDescription || metadata?.ogTitle) && (
        <div className="space-y-3 border-t border-border pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            SEO metadata
          </p>
          {metadata.seoTitle ? (
            <div>
              <p className="mb-1 text-[10px] text-muted-foreground">
                SEO title ({metadata.seoTitle.length} chars)
              </p>
              <p className="text-xs leading-relaxed">{metadata.seoTitle}</p>
            </div>
          ) : null}
          {metadata.metaDescription ? (
            <div>
              <p className="mb-1 text-[10px] text-muted-foreground">
                Meta description ({metadata.metaDescription.length} chars)
              </p>
              <p className="text-xs leading-relaxed">{metadata.metaDescription}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
