export type ArticleQualityInput = {
  bodyMarkdown: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  citations?: { text: string; url: string }[];
  faqSection?: { question: string; answer: string }[];
  jsonLdSchema?: object | null;
  internalLinkSuggestions?: { anchorText: string; suggestedSlug: string }[];
  wordCount?: number;
};

export type ArticleQualityBreakdown = {
  label: string;
  score: number;
  max: number;
  detail: string;
};

export type ArticleQualityResult = {
  total: number;
  breakdown: ArticleQualityBreakdown[];
};

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

export function scoreArticleQuality(input: ArticleQualityInput): ArticleQualityResult {
  const body = input.bodyMarkdown ?? "";
  const wordCount = input.wordCount ?? body.split(/\s+/).filter(Boolean).length;
  const h2Count = countMatches(body, /^## /gm);
  const hasFaq = (input.faqSection?.length ?? 0) >= 3;
  const citationCount = input.citations?.length ?? 0;
  const internalLinks = input.internalLinkSuggestions?.length ?? countMatches(body, /\[.+?\]\(\/[^)]+\)/g);
  const hasSchema = Boolean(input.jsonLdSchema && Object.keys(input.jsonLdSchema).length > 0);
  const titleLen = input.metaTitle?.length ?? 0;
  const metaLen = input.metaDescription?.length ?? 0;

  const breakdown: ArticleQualityBreakdown[] = [
    {
      label: "Structure",
      score: Math.min(20, h2Count >= 4 ? 20 : h2Count >= 2 ? 14 : h2Count >= 1 ? 8 : 0),
      max: 20,
      detail: `${h2Count} H2 sections`,
    },
    {
      label: "FAQ",
      score: hasFaq ? 15 : (input.faqSection?.length ?? 0) > 0 ? 8 : 0,
      max: 15,
      detail: hasFaq ? "FAQ section present" : "Add 3+ FAQ items",
    },
    {
      label: "Citations",
      score: Math.min(15, citationCount >= 3 ? 15 : citationCount >= 1 ? 8 : 0),
      max: 15,
      detail: `${citationCount} external citations`,
    },
    {
      label: "Internal links",
      score: Math.min(15, internalLinks >= 3 ? 15 : internalLinks >= 1 ? 8 : 0),
      max: 15,
      detail: `${internalLinks} internal link opportunities`,
    },
    {
      label: "Schema",
      score: hasSchema ? 10 : 0,
      max: 10,
      detail: hasSchema ? "JSON-LD present" : "Missing structured data",
    },
    {
      label: "Meta title",
      score: titleLen >= 30 && titleLen <= 60 ? 10 : titleLen > 0 ? 5 : 0,
      max: 10,
      detail: titleLen ? `${titleLen} characters` : "Missing meta title",
    },
    {
      label: "Meta description",
      score: metaLen >= 50 && metaLen <= 160 ? 10 : metaLen > 0 ? 5 : 0,
      max: 10,
      detail: metaLen ? `${metaLen} characters` : "Missing meta description",
    },
    {
      label: "Word count",
      score: wordCount >= 1200 && wordCount <= 2500 ? 5 : wordCount >= 800 ? 3 : wordCount >= 400 ? 1 : 0,
      max: 5,
      detail: `${wordCount.toLocaleString()} words`,
    },
  ];

  const total = breakdown.reduce((sum, item) => sum + item.score, 0);
  return { total, breakdown };
}
