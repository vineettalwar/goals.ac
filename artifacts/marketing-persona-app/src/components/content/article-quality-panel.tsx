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
  brandGlossary?: string[];
  brandVoicePassages?: string[];
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
  /** Brand voice context from project — used for local Human voice scoring. */
  writingSample?: string | null;
  brandGlossary?: string[] | null;
  brandVoicePassages?: string[] | null;
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

type ArticleQualityPanelBodyProps = ArticleQualityPanelProps & {
  dual: DualScore | null;
  refetchSerpScore?: () => void;
  isRefreshingSerp?: boolean;
};

function ArticleQualityPanelBody({
  onEnhance,
  enhancing = false,
  canEnhance = false,
  contentPieceId,
  savedBodyMarkdown,
  baselineScore,
  showScoreDelta = false,
  bodyMarkdown,
  wordCount,
  writingSample: writingSampleProp,
  brandVoiceExcerpt,
  brandGlossary: brandGlossaryProp,
  brandVoicePassages: brandVoicePassagesProp,
  dual,
  refetchSerpScore,
  isRefreshingSerp = false,
  ...props
}: ArticleQualityPanelBodyProps) {
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

  const draftDiffersFromSaved =
    savedBodyMarkdown != null && bodyMarkdown !== savedBodyMarkdown;

  const writingSample = writingSampleProp ?? dual?.writingSample ?? null;
  const brandGlossary = brandGlossaryProp ?? dual?.brandGlossary ?? undefined;
  const brandVoicePassages =
    brandVoicePassagesProp ?? dual?.brandVoicePassages ?? undefined;

  const voiceScoreInput = {
    writingSample,
    brandVoiceExcerpt,
    brandGlossary: brandGlossary?.length ? brandGlossary : undefined,
    brandVoicePassages: brandVoicePassages?.length ? brandVoicePassages : undefined,
  };

  const result = scoreArticleQuality({
    ...props,
    ...voiceScoreInput,
    bodyMarkdown: debouncedBody,
    wordCount: debouncedWordCount,
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
      ...voiceScoreInput,
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

  const displaySeoTitle = props.seoTitle ?? props.metaTitle;
  const displayOgTitle = props.ogTitle ?? displaySeoTitle;

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
              Editorial {editorialTotal} (live draft) · SERP {serpTotal} (last saved) · Combined{" "}
              {displayTotal}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Editorial {editorialTotal} (live draft)
            </p>
          )}
          {dual && draftDiffersFromSaved ? (
            <p className="mt-1 text-xs text-muted-foreground">
              SERP and H2 are from the last saved body — save or refresh to update.
            </p>
          ) : null}
          {scoreDelta !== 0 ? (
            <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">
              {formatScoreDelta(scoreDelta)}
            </p>
          ) : null}
          {contentPieceId && refetchSerpScore ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1 h-auto px-0 text-xs"
              onClick={() => void refetchSerpScore()}
              disabled={isRefreshingSerp}
            >
              {isRefreshingSerp ? "Refreshing SERP…" : "Refresh SERP score"}
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Editorial (live draft)
      </p>
      {result.breakdown.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={item.score === 0 ? "font-medium text-destructive" : "font-medium"}>
              {item.score}/{item.max}
            </span>
          </div>
          {item.label === "Human voice" && item.detail ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground/80">
              {item.detail}
            </p>
          ) : null}
        </div>
      ))}

      {dual?.serp.breakdown?.length ? (
        <div className="border-t border-border pt-3 space-y-2">
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

      {(displaySeoTitle || props.metaDescription || displayOgTitle || props.ogDescription) && (
        <div className="pt-2 border-t border-border space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            SEO metadata
          </p>
          {displaySeoTitle ? (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                SEO title ({displaySeoTitle.length} chars)
              </p>
              <p className="text-xs leading-relaxed">{displaySeoTitle}</p>
            </div>
          ) : null}
          {props.metaDescription ? (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                Meta description ({props.metaDescription.length} chars)
              </p>
              <p className="text-xs leading-relaxed">{props.metaDescription}</p>
            </div>
          ) : null}
          {displayOgTitle && displayOgTitle !== displaySeoTitle ? (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                Open Graph title ({displayOgTitle.length} chars)
              </p>
              <p className="text-xs leading-relaxed">{displayOgTitle}</p>
            </div>
          ) : null}
          {props.ogDescription && props.ogDescription !== props.metaDescription ? (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                Open Graph description ({props.ogDescription.length} chars)
              </p>
              <p className="text-xs leading-relaxed">{props.ogDescription}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ArticleQualityPanelWithSerp(
  props: ArticleQualityPanelProps & { contentPieceId: number },
) {
  const { contentPieceId, ...rest } = props;
  const {
    data: dual = null,
    refetch: refetchSerpScore,
    isFetching: isRefreshingSerp,
  } = useQuery({
    queryKey: ["content-piece-serp-score", contentPieceId, rest.savedBodyMarkdown ?? ""],
    queryFn: () => fetchDualScore(contentPieceId),
    staleTime: 30_000,
  });

  return (
    <ArticleQualityPanelBody
      {...rest}
      contentPieceId={contentPieceId}
      dual={dual}
      refetchSerpScore={() => void refetchSerpScore()}
      isRefreshingSerp={isRefreshingSerp}
    />
  );
}

export function ArticleQualityPanel(props: ArticleQualityPanelProps) {
  if (props.contentPieceId) {
    return <ArticleQualityPanelWithSerp {...props} contentPieceId={props.contentPieceId} />;
  }
  return <ArticleQualityPanelBody {...props} dual={null} />;
}
