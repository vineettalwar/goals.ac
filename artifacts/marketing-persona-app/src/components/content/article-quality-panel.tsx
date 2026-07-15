"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { scoreArticleQuality } from "@workspace/content-engine/articles/article-quality-score";
import { ScoreRing } from "@/components/content/score-ring";
import { Button } from "@/components/ui/button";

/** Pause after typing before re-running local editorial score (no server). */
const EDITORIAL_SCORE_DEBOUNCE_MS = 2000;

type ArticleQualityPanelProps = {
  bodyMarkdown: string;
  metaTitle?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  focusKeyword?: string | null;
  citations?: { text: string; url: string }[];
  faqSection?: { question: string; answer: string }[];
  jsonLdSchema?: object | null;
  internalLinkSuggestions?: { anchorText: string; suggestedSlug: string }[];
  wordCount?: number;
  writingSample?: string | null;
  brandVoiceExcerpt?: string | null;
  contentPieceId?: number | null;
  /** Last saved body — used to compute baseline for delta when `baselineScore` is omitted. */
  savedBodyMarkdown?: string | null;
  /** Precomputed score for the last saved body. Wins over scoring `savedBodyMarkdown`. */
  baselineScore?: number | null;
  /** When true (edit mode), show “+N vs saved” if live score differs from baseline. */
  showScoreDelta?: boolean;
  onEnhance?: () => void;
  enhancing?: boolean;
  canEnhance?: boolean;
};

type DualScore = {
  editorial: { total: number; breakdown: Array<{ label: string; score: number; max: number }> };
  serp: {
    total: number;
    breakdown: Array<{ label: string; score: number; max: number; detail: string }>;
    gaps: string[];
    h2Coverage?: { covered: number; total: number; percent: number };
  };
  combined: number;
  publishReady: boolean;
  competitorDiff?: Array<{ title: string; covered: boolean; overlap: number }>;
};

async function fetchDualScore(contentPieceId: number): Promise<DualScore | null> {
  const res = await fetch(`/api/content-pieces/${contentPieceId}/serp-score`);
  if (!res.ok) return null;
  return res.json() as Promise<DualScore>;
}

function formatScoreDelta(delta: number): string {
  if (delta > 0) return `+${delta} vs saved`;
  return `−${Math.abs(delta)} vs saved`;
}

function combineEditorialSerp(editorialTotal: number, serpTotal: number): number {
  return Math.round(editorialTotal * 0.55 + serpTotal * 0.45);
}

export function ArticleQualityPanel({
  onEnhance,
  enhancing = false,
  canEnhance = false,
  contentPieceId,
  savedBodyMarkdown,
  baselineScore,
  showScoreDelta = false,
  bodyMarkdown,
  wordCount,
  ...props
}: ArticleQualityPanelProps) {
  const [debouncedBody, setDebouncedBody] = useState(bodyMarkdown);
  const [debouncedWordCount, setDebouncedWordCount] = useState(wordCount);

  useEffect(() => {
    // Snap to saved baseline immediately on load/cancel/save; debounce live typing only.
    if (savedBodyMarkdown != null && bodyMarkdown === savedBodyMarkdown) {
      setDebouncedBody(bodyMarkdown);
      setDebouncedWordCount(wordCount);
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedBody(bodyMarkdown);
      setDebouncedWordCount(wordCount);
    }, EDITORIAL_SCORE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [bodyMarkdown, wordCount, savedBodyMarkdown]);

  const result = scoreArticleQuality({
    ...props,
    bodyMarkdown: debouncedBody,
    wordCount: debouncedWordCount,
  });

  // SERP half is DB-bodied on the server — do not refetch on draft keystrokes.
  const { data: dual = null } = useQuery({
    queryKey: ["content-piece-serp-score", contentPieceId],
    queryFn: () => fetchDualScore(contentPieceId!),
    enabled: Boolean(contentPieceId),
    staleTime: 30_000,
  });

  const editorialTotal = result.total;
  const serpTotal = dual?.serp.total;
  const displayTotal =
    dual && serpTotal != null
      ? combineEditorialSerp(editorialTotal, serpTotal)
      : editorialTotal;
  const needsEnhance = displayTotal < 80;

  let baselineTotal: number | null =
    typeof baselineScore === "number" && Number.isFinite(baselineScore) ? baselineScore : null;
  if (baselineTotal == null && savedBodyMarkdown != null) {
    const savedWords = savedBodyMarkdown.split(/\s+/).filter(Boolean).length;
    const savedEditorial = scoreArticleQuality({
      ...props,
      bodyMarkdown: savedBodyMarkdown,
      wordCount: savedWords,
    }).total;
    baselineTotal =
      dual && serpTotal != null
        ? combineEditorialSerp(savedEditorial, serpTotal)
        : savedEditorial;
  }

  const scoreDelta =
    showScoreDelta && baselineTotal != null ? displayTotal - baselineTotal : 0;

  return (
    <div className="paper-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={displayTotal} size={88} label="Article score" />
        <div>
          <h3 className="font-semibold text-sm">Quality breakdown</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {dual && serpTotal != null && editorialTotal >= 70 && serpTotal >= 65
              ? "Publish-ready (editorial + SERP)"
              : displayTotal >= 80
                ? "Publish-ready"
                : displayTotal >= 60
                  ? "Needs polish"
                  : "Improve before publishing"}
          </p>
          {dual ? (
            <p className="text-xs text-muted-foreground mt-1">
              Editorial {editorialTotal} · SERP {serpTotal} · Combined {displayTotal}
            </p>
          ) : null}
          {scoreDelta !== 0 ? (
            <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">
              {formatScoreDelta(scoreDelta)}
            </p>
          ) : null}
        </div>
      </div>

      {result.breakdown.map((item) => (
        <div key={item.label} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{item.label}</span>
          <span className={item.score === 0 ? "font-medium text-destructive" : "font-medium"}>
            {item.score}/{item.max}
          </span>
        </div>
      ))}

      {dual?.serp.breakdown?.length ? (
        <div className="border-t border-border pt-3 space-y-2">
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
          {dual.serp.h2Coverage && dual.serp.h2Coverage.total > 0 ? (
            <p className="text-xs text-muted-foreground">
              {`H2 coverage: ${dual.serp.h2Coverage.percent}% (${dual.serp.h2Coverage.covered}/${dual.serp.h2Coverage.total} rival topics)`}
            </p>
          ) : null}
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
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Competitor topics (top SERP)
          </p>
          <ul className="space-y-1.5">
            {dual.competitorDiff.map((row) => (
              <li key={row.title} className="flex items-start justify-between gap-2 text-xs">
                <span className={row.covered ? "text-muted-foreground" : "text-foreground"}>
                  {row.title}
                </span>
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
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            {dual?.serp.gaps.length
              ? "Fix gaps runs an enhance pass targeting SERP, FAQ, citations, and internal links."
              : "Missing FAQ, citations, or SERP angles? Enhance adds them without a full rewrite."}
          </p>
          <Button className="w-full" size="sm" onClick={onEnhance} disabled={enhancing}>
            <TrendingUp className="h-3.5 w-3.5" />
            {enhancing
              ? "Fixing gaps…"
              : dual?.serp.gaps.length
                ? "Fix gaps"
                : "Enhance quality"}
          </Button>
        </div>
      ) : null}

      {(props.seoTitle || props.metaDescription || props.ogTitle || props.ogDescription) && (
        <div className="pt-2 border-t border-border space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            SEO metadata
          </p>
          {props.seoTitle && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                SEO title ({props.seoTitle.length} chars)
              </p>
              <p className="text-xs leading-relaxed">{props.seoTitle}</p>
            </div>
          )}
          {props.metaDescription && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                Meta description ({props.metaDescription.length} chars)
              </p>
              <p className="text-xs leading-relaxed">{props.metaDescription}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
