import { scoreArticleQuality } from "@workspace/content-engine/article-quality-score";
import { ScoreRing } from "../section-panels/shared";
import type { ContentPieceMetadata } from "./types";

type ArticleQualityPanelProps = {
  bodyMarkdown: string;
  wordCount?: number;
  metadata?: ContentPieceMetadata | null;
  onEnhance?: () => void;
  enhancing?: boolean;
  canEnhance?: boolean;
};

export function ArticleQualityPanel({
  bodyMarkdown,
  wordCount,
  metadata,
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
  const needsEnhance = result.total < 80;

  return (
    <div className="paper-card space-y-4 rounded-xl p-5">
      <div className="flex items-center gap-4">
        <ScoreRing score={result.total} size="md" />
        <div>
          <h3 className="text-sm font-semibold">Quality breakdown</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {result.total >= 80
              ? "Publish-ready"
              : result.total >= 60
                ? "Needs polish"
                : "Improve before publishing"}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {result.breakdown.map((item) => (
          <li key={item.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={item.score === 0 ? "font-medium text-red-600" : "font-medium"}>
              {item.score}/{item.max}
            </span>
          </li>
        ))}
      </ul>

      {canEnhance && needsEnhance && onEnhance ? (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            Missing FAQ, citations, or links? Enhance adds them without rewriting from scratch.
          </p>
          <button
            type="button"
            className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
            onClick={onEnhance}
            disabled={enhancing}
          >
            {enhancing ? "Enhancing…" : "Enhance quality"}
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
