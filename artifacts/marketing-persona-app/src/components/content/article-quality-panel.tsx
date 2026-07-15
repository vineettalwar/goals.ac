"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { scoreArticleQuality } from "@workspace/content-engine/articles/article-quality-score";
import { ScoreRing } from "@/components/content/score-ring";
import { Button } from "@/components/ui/button";

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
  contentPieceId?: number | null;
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

export function ArticleQualityPanel({
  onEnhance,
  enhancing = false,
  canEnhance = false,
  contentPieceId,
  ...props
}: ArticleQualityPanelProps) {
  const result = scoreArticleQuality(props);
  const { data: dual = null } = useQuery({
    queryKey: ["content-piece-serp-score", contentPieceId, props.bodyMarkdown, props.wordCount],
    queryFn: () => fetchDualScore(contentPieceId!),
    enabled: Boolean(contentPieceId),
    staleTime: 30_000,
  });

  const displayTotal = dual?.combined ?? result.total;
  const needsEnhance = displayTotal < 80;
  const editorialTotal = dual?.editorial.total ?? result.total;
  const serpTotal = dual?.serp.total;

  return (
    <div className="paper-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={displayTotal} size={88} label="Article score" />
        <div>
          <h3 className="font-semibold text-sm">Quality breakdown</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {dual?.publishReady
              ? "Publish-ready (editorial + SERP)"
              : displayTotal >= 80
                ? "Publish-ready"
                : displayTotal >= 60
                  ? "Needs polish"
                  : "Improve before publishing"}
          </p>
          {dual ? (
            <p className="text-xs text-muted-foreground mt-1">
              Editorial {editorialTotal} · SERP {serpTotal} · Combined {dual.combined}
            </p>
          ) : null}
        </div>
      </div>

      {(dual?.editorial.breakdown ?? result.breakdown).map((item) => (
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
