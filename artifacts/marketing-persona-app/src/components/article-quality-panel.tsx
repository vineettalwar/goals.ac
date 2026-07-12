"use client";

import { scoreArticleQuality } from "@workspace/content-engine/article-quality-score";
import { ScoreRing } from "@/components/score-ring";

type ArticleQualityPanelProps = {
  bodyMarkdown: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  citations?: { text: string; url: string }[];
  faqSection?: { question: string; answer: string }[];
  jsonLdSchema?: object | null;
  internalLinkSuggestions?: { anchorText: string; suggestedSlug: string }[];
  wordCount?: number;
};

export function ArticleQualityPanel(props: ArticleQualityPanelProps) {
  const result = scoreArticleQuality(props);

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
            <span className="font-medium">
              {item.score}/{item.max}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
