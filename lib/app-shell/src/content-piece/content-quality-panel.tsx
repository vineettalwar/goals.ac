import { useEffect, useState } from "react";
import { scoreArticleQuality } from "@workspace/content-engine/article-quality-score";
import { ScoreRing } from "../section-panels/shared";
import type { ContentPieceMetadata } from "./types";

/** Pause after typing before re-running local editorial score (no server). */
const EDITORIAL_SCORE_DEBOUNCE_MS = 2000;

export type DualContentScore = {
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
  scoredAt?: string;
};

type ArticleQualityPanelProps = {
  bodyMarkdown: string;
  wordCount?: number;
  metadata?: ContentPieceMetadata | null;
  contentPieceId?: number | null;
  /** Host fetches `/api/content-pieces/:id/serp-score` (JWT or cookie). */
  fetchDualScore?: (contentPieceId: number) => Promise<DualContentScore | null>;
  /** When parent already loaded dual score (e.g. brief panel), skip internal fetch. */
  dualScore?: DualContentScore | null;
  /** Optional brand voice signals for Human voice editorial score. */
  writingSample?: string | null;
  brandVoiceExcerpt?: string | null;
  brandGlossary?: string[];
  brandVoicePassages?: string[];
  /** Last saved body — used to compute baseline for delta when `baselineScore` is omitted. */
  savedBodyMarkdown?: string | null;
  /** Precomputed score for the last saved body (editorial or combined). Wins over scoring `savedBodyMarkdown`. */
  baselineScore?: number | null;
  /** When true (edit mode), show “+N vs saved” if live score differs from baseline. */
  showScoreDelta?: boolean;
  onEnhance?: () => void;
  enhancing?: boolean;
  canEnhance?: boolean;
};

function formatScoreDelta(delta: number): string {
  if (delta > 0) return `+${delta} vs saved`;
  return `−${Math.abs(delta)} vs saved`;
}

function combineEditorialSerp(editorialTotal: number, serpTotal: number): number {
  return Math.round(editorialTotal * 0.55 + serpTotal * 0.45);
}

export function ArticleQualityPanel({
  bodyMarkdown,
  wordCount,
  metadata,
  contentPieceId,
  fetchDualScore,
  dualScore,
  writingSample,
  brandVoiceExcerpt,
  brandGlossary,
  brandVoicePassages,
  savedBodyMarkdown,
  baselineScore,
  showScoreDelta = false,
  onEnhance,
  enhancing = false,
  canEnhance = false,
}: ArticleQualityPanelProps) {
  const [debouncedBody, setDebouncedBody] = useState(bodyMarkdown);
  const [debouncedWordCount, setDebouncedWordCount] = useState(wordCount);
  const [fetchedDual, setFetchedDual] = useState<DualContentScore | null>(null);
  const [refreshingSerp, setRefreshingSerp] = useState(false);
  // Refreshed SERP wins over a parent-provided snapshot.
  const dual = fetchedDual ?? dualScore;
  const draftDiffersFromSaved =
    savedBodyMarkdown != null && bodyMarkdown !== savedBodyMarkdown;
  const canRefreshSerp = Boolean(contentPieceId && fetchDualScore);
  
  // Format timestamp for display
  const serpScoredAt = dual?.scoredAt;
  const serpTimestamp = serpScoredAt
    ? new Date(serpScoredAt).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;
  const serpIsStale = draftDiffersFromSaved && serpScoredAt;

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

  const scoreInput = {
    bodyMarkdown: debouncedBody,
    wordCount: debouncedWordCount,
    metaTitle: metadata?.seoTitle ?? metadata?.metaTitle ?? null,
    metaDescription: metadata?.metaDescription ?? null,
    citations: metadata?.citations,
    faqSection: metadata?.faqSection,
    jsonLdSchema: metadata?.jsonLdSchema,
    internalLinkSuggestions: metadata?.internalLinkSuggestions,
    writingSample,
    brandVoiceExcerpt,
    brandGlossary,
    brandVoicePassages,
  };
  const result = scoreArticleQuality(scoreInput);

  useEffect(() => {
    setFetchedDual(null);
  }, [contentPieceId]);

  useEffect(() => {
    if (dualScore != null || !contentPieceId || !fetchDualScore) {
      return;
    }
    let cancelled = false;
    void fetchDualScore(contentPieceId)
      .then((data) => {
        if (!cancelled) setFetchedDual(data);
      })
      .catch(() => {
        if (!cancelled) setFetchedDual(null);
      });
    return () => {
      cancelled = true;
    };
  }, [contentPieceId, fetchDualScore, dualScore]);

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
      ...scoreInput,
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

  const refreshSerpScore = () => {
    if (!contentPieceId || !fetchDualScore || refreshingSerp) return;
    setRefreshingSerp(true);
    void fetchDualScore(contentPieceId)
      .then((data) => setFetchedDual(data))
      .catch(() => setFetchedDual(null))
      .finally(() => setRefreshingSerp(false));
  };

  return (
    <div className="paper-card space-y-4 rounded-xl p-5">
      <div className="flex items-center gap-4">
        <ScoreRing score={displayTotal} size="md" />
        <div>
          <h3 className="text-sm font-semibold">Quality breakdown</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {dual && serpTotal != null && editorialTotal >= 70 && serpTotal >= 65
              ? "Publish-ready (editorial + SERP)"
              : displayTotal >= 80
                ? "Publish-ready"
                : displayTotal >= 60
                  ? "Needs polish"
                  : "Improve before publishing"}
          </p>
          {dual ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Editorial {editorialTotal} (live draft) · SERP {serpTotal} (last saved) · Combined{" "}
              {displayTotal}
              {serpTimestamp ? ` · Scored ${serpTimestamp}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Editorial {editorialTotal} (live draft)
            </p>
          )}
          {dual && serpIsStale ? (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              SERP score is from last saved version — save or refresh to update.
            </p>
          ) : dual && draftDiffersFromSaved ? (
            <p className="mt-1 text-xs text-muted-foreground">
              SERP and H2 are from the last saved body — save or refresh to update.
            </p>
          ) : null}
          {scoreDelta !== 0 ? (
            <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">
              {formatScoreDelta(scoreDelta)}
            </p>
          ) : null}
          {canRefreshSerp ? (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
              onClick={refreshSerpScore}
              disabled={refreshingSerp}
            >
              {refreshingSerp ? "Refreshing SERP…" : "Refresh SERP score"}
            </button>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Editorial (live draft)
        </p>
        <ul className="space-y-2">
          {result.breakdown.map((item) => (
            <li key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={item.score === 0 ? "font-medium text-red-600" : "font-medium"}>
                  {item.score}/{item.max}
                </span>
              </div>
              {item.label === "Human voice" && item.detail ? (
                <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                  {item.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {dual?.serp.breakdown?.length ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            SERP / H2 (last saved)
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
