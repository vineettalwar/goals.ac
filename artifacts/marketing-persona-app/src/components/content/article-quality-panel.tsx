"use client";

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
  onEnhance?: () => void;
  enhancing?: boolean;
  canEnhance?: boolean;
};

export function ArticleQualityPanel({
  onEnhance,
  enhancing = false,
  canEnhance = false,
  ...props
}: ArticleQualityPanelProps) {
  const result = scoreArticleQuality(props);
  const needsEnhance = result.total < 80;

  return (
    <div className="paper-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={result.total} size={88} label="Article score" />
        <div>
          <h3 className="font-semibold text-sm">Quality breakdown</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {result.total >= 80 ? "Publish-ready" : result.total >= 60 ? "Needs polish" : "Improve before publishing"}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {result.breakdown.map((item) => (
          <li key={item.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={item.score === 0 ? "font-medium text-destructive" : "font-medium"}>
              {item.score}/{item.max}
            </span>
          </li>
        ))}
      </ul>

      {canEnhance && needsEnhance && onEnhance && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Missing FAQ, citations, or links? Enhance adds them without rewriting from scratch.
          </p>
          <Button className="w-full" size="sm" onClick={onEnhance} disabled={enhancing}>
            <TrendingUp className="h-3.5 w-3.5" />
            {enhancing ? "Enhancing…" : "Enhance quality"}
          </Button>
        </div>
      )}

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
          {props.ogTitle && props.ogTitle !== props.seoTitle && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Open Graph title</p>
              <p className="text-xs leading-relaxed">{props.ogTitle}</p>
            </div>
          )}
          {props.ogDescription && props.ogDescription !== props.metaDescription && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Open Graph description</p>
              <p className="text-xs leading-relaxed">{props.ogDescription}</p>
            </div>
          )}
          {props.focusKeyword && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Focus keyword</p>
              <p className="text-xs leading-relaxed">{props.focusKeyword}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
