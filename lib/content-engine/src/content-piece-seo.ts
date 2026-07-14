import type { ContentFormatType } from "@workspace/db";
import {
  AI_WRITING_FROM_SCRATCH_PROMPT,
  AI_WRITING_RULES_PROMPT,
  sanitizeAiProse,
} from "./ai-writing-rules";

export const SEO_LONGFORM_FORMATS: ContentFormatType[] = [
  "blog_post",
  "guide",
  "tutorial",
  "pillar_page",
  "whitepaper",
  "faq_article",
  "news_article",
  "location_page",
];

export function isSeoLongformFormat(format: ContentFormatType): boolean {
  return SEO_LONGFORM_FORMATS.includes(format);
}

export type ContentPieceFaqItem = {
  question: string;
  answer: string;
};

export type ContentPieceCitation = {
  text: string;
  url: string;
  source: string;
};

export type ContentPieceInternalLink = {
  anchorText: string;
  suggestedSlug: string;
  rationale?: string;
};

export type HumanizationAudit = {
  slopScoreBefore: number;
  slopScoreAfter: number;
  humanizationLevel: "off" | "light" | "strong";
  rejected?: boolean;
  tellsFixed?: number;
};

export type ContentPieceMetadata = {
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  featuredImageUrl?: string;
  images?: import("@workspace/db").ContentPieceImageRef[];
  faqSection?: ContentPieceFaqItem[];
  citations?: ContentPieceCitation[];
  internalLinkSuggestions?: ContentPieceInternalLink[];
  jsonLdSchema?: object;
  humanized?: boolean;
  humanizationAudit?: HumanizationAudit;
  hasInfographicBlock?: boolean;
  deeplRefined?: boolean;
  deeplTargetLang?: string;
  visualSummaryMarkdown?: string;
};

export type RichContentPieceFields = ContentPieceMetadata & {
  seo_title?: string;
  seoTitle?: string;
  focus_keyword?: string;
  focusKeyword?: string;
  og_title?: string;
  ogTitle?: string;
  og_description?: string;
  ogDescription?: string;
  og_image_url?: string;
  ogImageUrl?: string;
  meta_description?: string;
  faq_section?: ContentPieceFaqItem[];
  citations?: ContentPieceCitation[];
  internal_link_suggestions?: ContentPieceInternalLink[];
  json_ld_schema?: object;
};

export function countExternalLinks(body: string): number {
  return (body.match(/\[.+?\]\(https?:\/\/[^)]+\)/g) ?? []).length;
}

export function countInternalLinks(body: string): number {
  return (body.match(/\[.+?\]\(\/[^)]+\)/g) ?? []).length;
}

export function countFaqItems(body: string): number {
  const faqSection =
    body.match(/##\s*(?:FAQ|Frequently Asked Questions)[\s\S]*/i)?.[0] ?? "";
  const target = faqSection || body;
  const h3Questions = (target.match(/^###\s+.+\?/gm) ?? []).length;
  const boldQuestions = (target.match(/^\*\*.+\?\*\*/gm) ?? []).length;
  return Math.max(h3Questions, boldQuestions);
}

export function bodyWordCount(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

function appendFaqSection(body: string, faqs: ContentPieceFaqItem[]): string {
  if (faqs.length === 0 || /##\s*(?:FAQ|Frequently Asked Questions)/i.test(body)) {
    return body;
  }
  const section = faqs
    .map((faq) => `### ${faq.question.trim()}\n\n${faq.answer.trim()}`)
    .join("\n\n");
  return `${body.trim()}\n\n## Frequently Asked Questions\n\n${section}`;
}

function extractH2Headings(body: string): string[] {
  const matches = body.match(/^##\s+(.+)$/gm) ?? [];
  return matches
    .map((heading) => heading.replace(/^##\s+/, "").trim())
    .filter((heading) => !/^(?:faq|frequently asked questions|visual summary)$/i.test(heading))
    .slice(0, 4);
}

export function buildVisualSummaryMarkdown(input: {
  title: string;
  focusKeyword?: string;
  body: string;
  faqs?: ContentPieceFaqItem[];
}): string {
  const headings = extractH2Headings(input.body);
  const words = bodyWordCount(input.body);
  const externalLinks = countExternalLinks(input.body);
  const internalLinks = countInternalLinks(input.body);
  const faqCount = input.faqs?.length ?? countFaqItems(input.body);

  const bullets =
    headings.length > 0
      ? headings.map((heading) => `- **${heading}** — core takeaway from this section`)
      : [
          input.focusKeyword
            ? `- **Focus keyword:** ${input.focusKeyword}`
            : `- **Topic:** ${input.title}`,
        ];

  const table = `| Metric | Value |
| --- | --- |
| Word count | ${words.toLocaleString()} |
| External citations | ${externalLinks} |
| Internal links | ${internalLinks} |
| FAQ answers | ${faqCount} |`;

  return `## Visual Summary

${table}

${bullets.join("\n")}
`;
}

function appendVisualSummary(body: string, summary: string): string {
  if (/##\s*Visual Summary/i.test(body)) return body;

  const faqMatch = body.match(/\n##\s*(?:FAQ|Frequently Asked Questions)/i);
  if (faqMatch?.index != null) {
    return `${body.slice(0, faqMatch.index).trim()}\n\n${summary.trim()}\n\n${body.slice(faqMatch.index).trim()}`;
  }

  return `${body.trim()}\n\n${summary.trim()}`;
}

function normalizeMetadata(raw: RichContentPieceFields): ContentPieceMetadata {
  return {
    seoTitle: raw.seo_title ?? raw.seoTitle,
    metaDescription: raw.meta_description ?? raw.metaDescription,
    focusKeyword: raw.focus_keyword ?? raw.focusKeyword,
    ogTitle: raw.og_title ?? raw.ogTitle,
    ogDescription: raw.og_description ?? raw.ogDescription,
    ogImageUrl: raw.og_image_url ?? raw.ogImageUrl,
    faqSection: raw.faq_section ?? raw.faqSection,
    citations: raw.citations,
    internalLinkSuggestions:
      raw.internal_link_suggestions ?? raw.internalLinkSuggestions,
    jsonLdSchema: raw.json_ld_schema ?? raw.jsonLdSchema,
  };
}

export function finalizeSeoContentPiece<
  T extends {
    title: string;
    target_keyword: string;
    body_markdown: string;
  } & RichContentPieceFields,
>(result: T): T & { pieceMetadata: ContentPieceMetadata } {
  const metadata = normalizeMetadata(result);
  let body = sanitizeAiProse(result.body_markdown.trim());
  const metaDescription = metadata.metaDescription
    ? sanitizeAiProse(metadata.metaDescription)
    : metadata.metaDescription;

  if (metadata.faqSection?.length) {
    body = appendFaqSection(body, metadata.faqSection);
  }

  const visualSummary = buildVisualSummaryMarkdown({
    title: sanitizeAiProse(result.title),
    focusKeyword: metadata.focusKeyword ?? result.target_keyword,
    body,
    faqs: metadata.faqSection,
  });
  body = appendVisualSummary(body, visualSummary);

  return {
    ...result,
    title: sanitizeAiProse(result.title),
    body_markdown: body,
    meta_description: result.meta_description
      ? sanitizeAiProse(result.meta_description)
      : result.meta_description,
    pieceMetadata: {
      ...metadata,
      seoTitle: metadata.seoTitle ?? sanitizeAiProse(result.title),
      metaDescription,
      focusKeyword: metadata.focusKeyword ?? result.target_keyword,
      ogTitle: metadata.ogTitle ?? metadata.seoTitle ?? sanitizeAiProse(result.title),
      ogDescription: metadata.ogDescription ?? metaDescription,
      faqSection: metadata.faqSection?.map((faq) => ({
        question: sanitizeAiProse(faq.question),
        answer: sanitizeAiProse(faq.answer),
      })),
      visualSummaryMarkdown: visualSummary,
    },
  };
}

export function seoQualitySignals(body: string): {
  externalLinks: number;
  internalLinks: number;
  faqItems: number;
  words: number;
} {
  return {
    externalLinks: countExternalLinks(body),
    internalLinks: countInternalLinks(body),
    faqItems: countFaqItems(body),
    words: bodyWordCount(body),
  };
}

export const SEO_SYSTEM_PROMPT = `You are a world-class SEO strategist and content writer who produces editorial-quality articles that rank on Google and surface in AI search engines (ChatGPT, Perplexity, Claude).

Writing principles:
- Be specific, concrete, and direct. No vague generalities or padding.
- Use real-world examples, stats, named frameworks, and actionable steps
- Write naturally for humans. No AI-sounding filler.
- Structure with H2/H3 headings, short paragraphs, and scannable bullet lists
${AI_WRITING_FROM_SCRATCH_PROMPT}
${AI_WRITING_RULES_PROMPT}
- Every statistical or factual claim MUST have an inline citation: [Publisher Name](https://real-url)
- Include ## Frequently Asked Questions with 4-6 ### questions ending in ?
- Embed 3+ internal links inline as [descriptive anchor](/blog/slug) inside body paragraphs
- Never copy outline instructions, word-count labels, or placeholder headings into the output

Quality bar: the draft MUST pass ALL of these before you respond:
1. 1,200+ words in body_markdown
2. 4+ ## H2 sections with real topic names (not "Core Insight 1")
3. 4+ external citation links to authoritative sources (.gov, .edu, named research)
4. 3+ internal links woven into prose
5. 4+ FAQ items under ## Frequently Asked Questions
6. meta_description between 150-160 characters

BAD output (never do this):
"Engaging introduction (hook + premise, 2-3 sentences)\\n## Why [Topic] Matters (150-200 words)"

GOOD output (do this):
"Local SEO decides whether nearby buyers find you first. According to [Google](https://developers.google.com/search/docs/appearance/local-seo), proximity and relevance drive map pack rankings.\\n\\n## Why local search matters for startups\\n..."

Respond ONLY with a valid JSON object. No markdown code fences, no explanation.`;

export function buildSeoLongformJsonSchema(keyword: string): string {
  return `{
  "title": "<compelling SEO title with target keyword, 55-65 characters>",
  "target_keyword": "${keyword}",
  "seo_title": "<optional distinct SEO title if different from title>",
  "meta_description": "<150-160 character meta description with primary keyword>",
  "focus_keyword": "${keyword}",
  "og_title": "<Open Graph title, 55-70 characters>",
  "og_description": "<Open Graph description, 150-200 characters>",
  "body_markdown": "<full publish-ready markdown article>",
  "faq_section": [{ "question": "<user-style question ending with ?>", "answer": "<2-4 sentence answer>" }],
  "citations": [{ "text": "<anchor text used in article>", "url": "<https://real-authoritative-url>", "source": "<publisher name>" }],
  "internal_link_suggestions": [{ "anchorText": "<phrase>", "suggestedSlug": "/blog/example-slug", "rationale": "<why link here>" }],
  "json_ld_schema": { "@context": "https://schema.org", "@type": "Article", "headline": "<title>", "description": "<meta description>" }
}`;
}

export function describeQualityGaps(body: string, wordCount?: number): string {
  const signals = seoQualitySignals(body);
  const words = wordCount ?? signals.words;
  const gaps: string[] = [];

  if (words < 1200) gaps.push(`Word count: ${words} — expand to at least 1,200 words`);
  if (signals.externalLinks < 4) {
    gaps.push(`External citations: ${signals.externalLinks} — add ${4 - signals.externalLinks} more inline [Source](https://...) links`);
  }
  if (signals.internalLinks < 3) {
    gaps.push(`Internal links: ${signals.internalLinks} — weave in ${3 - signals.internalLinks} more [anchor text](/blog/slug) links in prose`);
  }
  if (signals.faqItems < 4) {
    gaps.push(`FAQ section: ${signals.faqItems} items — add ## Frequently Asked Questions with ${4 - signals.faqItems}+ ### questions`);
  }
  const h2Count = (body.match(/^## /gm) ?? []).length;
  if (h2Count < 4) gaps.push(`Structure: ${h2Count} H2 sections — need at least 4 named sections`);

  if (gaps.length === 0) return "Draft meets SEO quality targets. Polish prose and tighten meta_description if needed.";
  return gaps.map((g) => `- ${g}`).join("\n");
}

export function buildSeoLongformRequirements(
  brandName: string,
  keyword: string,
  wordRange: string,
): string {
  return `Requirements for body_markdown:
- Write ${wordRange} words of publish-ready prose. NEVER an outline, brief, or template.
- Open with a hook paragraph (no label like "Engaging introduction"). Start on the actual point, not a generic landscape opener.
- Commit to direct claims instead of hedging. Prefer specifics over abstract noun fog.
- Use 4-6 concrete ## H2 headings named after the actual topic (e.g. "## Why local SEO matters for startups", NOT "## Core Insight 1")
- Every stat or research claim needs an inline citation: [Source Name](https://real-url)
- Minimum 4 external citations to authoritative sources (.gov, .edu, industry research, named publications)
- Minimum 3 internal links inline in paragraphs: [anchor text](/blog/suggested-slug)
- End with ## Frequently Asked Questions containing 4-6 ### questions (each ending with ?) and 2-4 sentence answers
- Reference ${brandName} 2-3 times naturally without sounding promotional
- Target "${keyword}" in the intro, 2+ H2 headings, and conclusion

Requirements for faq_section:
- Mirror the FAQ in body_markdown: 4-6 pairs targeting People Also Ask queries for "${keyword}"

Requirements for citations:
- One entry per external link used in body_markdown (text, url, source)

Requirements for internal_link_suggestions:
- 3-5 opportunities; every suggestedSlug MUST appear as an inline link in body_markdown

Requirements for meta_description:
- Exactly 150-160 characters, includes "${keyword}", drives clicks

Requirements for json_ld_schema:
- Valid JSON-LD with @type Article; include FAQPage mainEntity when faq_section is present

Before responding, self-check: 1200+ words, 4+ H2s, 4+ external links, 3+ internal links, 4+ FAQs. If any check fails, fix before returning JSON.`;
}
