import { scoreArticleQuality } from "@workspace/content-engine/articles/article-quality-score";

/** Sample article for public quality score demo (B2B SaaS GEO topic). */
export const ARTICLE_QUALITY_DEMO = {
  brandName: "Acme Analytics",
  brandColors: ["#2563EB", "#60A5FA", "#DBEAFE", "#F8FAFC"],
  voiceTags: ["founder-friendly", "data-backed", "plain-language"],
  offerings: ["GEO audit", "Content autopilot", "LLM visibility tracking", "CMS publish"],
  metaTitle: "GEO Audit Checklist: What AI Search Engines Need From Your Site",
  metaDescription:
    "A practical GEO audit checklist for B2B SaaS teams. Cover schema, citations, FAQ blocks, and llms.txt so ChatGPT and Perplexity can cite your pages.",
  focusKeyword: "GEO audit checklist",
  wordCount: 2140,
  citations: [
    { text: "Google Search Central", url: "https://developers.google.com/search/docs" },
    { text: "Schema.org Article", url: "https://schema.org/Article" },
    { text: "Perplexity publisher guidelines", url: "https://docs.perplexity.ai" },
    { text: "OpenAI crawling FAQ", url: "https://openai.com/search" },
  ],
  faqSection: [
    {
      question: "What is a GEO audit?",
      answer: "A GEO audit checks whether generative engines can retrieve, parse, and cite your content accurately.",
    },
    {
      question: "How often should I run a GEO audit?",
      answer: "Run a baseline audit at launch, then monthly or after major template changes.",
    },
    {
      question: "Does GEO replace traditional SEO?",
      answer: "No. GEO complements SEO. Strong technical SEO still feeds both Google and AI retrieval.",
    },
    {
      question: "What is llms.txt?",
      answer: "A machine-readable index that tells LLM crawlers which pages matter most on your site.",
    },
  ],
  internalLinkSuggestions: [
    { anchorText: "free GEO audit tool", suggestedSlug: "/geo-audit" },
    { anchorText: "LLM visibility dashboard", suggestedSlug: "/llm-visibility" },
    { anchorText: "content autopilot", suggestedSlug: "/content-autopilot" },
    { anchorText: "brand voice matching", suggestedSlug: "/brand-voice" },
  ],
  jsonLdSchema: {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "GEO Audit Checklist for B2B SaaS",
    author: { "@type": "Organization", name: "Acme Analytics" },
  },
  bodyMarkdown: `# GEO Audit Checklist: What AI Search Engines Need From Your Site

> **TL;DR:** Run a GEO audit on your homepage and top 5 money pages. Fix schema gaps, add FAQ blocks, tighten meta tags, and publish llms.txt so AI systems can cite you accurately.

If you're shipping content every week but still invisible in ChatGPT answers, the problem is rarely volume. It's **retrievability**. A GEO audit tells you whether generative engines can parse your pages, trust your structure, and cite your brand when buyers ask niche questions.

## Why GEO audits matter for B2B SaaS

Buyers now ask AI assistants for vendor shortlists before they touch Google. If your product pages lack FAQ schema, clear H2 structure, or authoritative citations, models default to competitors with cleaner technical signals.

According to [Google Search Central](https://developers.google.com/search/docs), structured data helps systems understand page purpose. [Schema.org Article](https://schema.org/Article) markup is a baseline for long-form guides that models summarize.

## Technical checklist

### 1. Title and meta description

Keep titles between 30–60 characters with the primary keyword near the front. Meta descriptions should answer the query in 50–160 characters. Skip keyword stuffing.

### 2. Heading hierarchy

Use one H1, then H2 sections for each subtopic. Models chunk content by headings when building answers.

### 3. FAQ block with schema

Add at least three buyer questions with concise answers. FAQ schema increases the chance your page is quoted verbatim.

### 4. Citations and statistics

Link to primary sources. Pages with outbound citations to authoritative domains score higher on trust heuristics in both SEO and GEO evaluators.

### 5. Internal links to pillar pages

Connect cluster posts to your product and solution pages. See our [free GEO audit tool](/geo-audit) and [LLM visibility dashboard](/llm-visibility) for live examples.

### 6. llms.txt and crawl policy

Publish \`llms.txt\` at your domain root listing priority URLs. Pair it with a robots.txt that does not block helpful AI crawlers you want to allow.

## Content quality signals

| Signal | Target |
| --- | --- |
| Word count | 1,200–2,500 for guides |
| External citations | 3+ authoritative sources |
| Internal links | 3+ contextual links |
| FAQ items | 3+ with schema |
| Images | Alt text on every visual |

## Humanization vs generic AI output

Generic drafts list tips without rhythm or point of view. After our humanization pass, the same outline reads like a practitioner wrote it: varied sentence length, concrete examples, and second-person guidance without AI-tell phrases.

**Before:** "It is important to note that implementing schema markup can be beneficial for visibility."

**After:** "Start with Article + FAQ schema on your top guide. It's the fastest win we see in weekly GEO re-audits."

## Start with Acme Analytics

Run our [content autopilot](/content-autopilot) with [brand voice matching](/brand-voice) enabled. Every draft inherits your glossary, tone, and product links before you review and publish.

## FAQ

### What is a GEO audit?

A GEO audit checks whether generative engines can retrieve, parse, and cite your content accurately.

### How often should I run a GEO audit?

Run a baseline audit at launch, then monthly or after major template changes.

### Does GEO replace traditional SEO?

No. GEO complements SEO. Strong technical SEO still feeds both Google and AI retrieval.

### What is llms.txt?

A machine-readable index that tells LLM crawlers which pages matter most on your site.
`,
  humanizationBefore:
    "It is important to note that implementing schema markup can be beneficial for visibility in generative search engines. Organizations should consider adding FAQ sections.",
  humanizationAfter:
    "Start with Article + FAQ schema on your top guide. It's the fastest win we see in weekly GEO re-audits. Add three real buyer questions, not filler.",
};

/** Computed from the sample article using the same rubric as the content editor. */
export const ARTICLE_QUALITY_DEMO_SCORE = scoreArticleQuality({
  bodyMarkdown: ARTICLE_QUALITY_DEMO.bodyMarkdown,
  metaTitle: ARTICLE_QUALITY_DEMO.metaTitle,
  metaDescription: ARTICLE_QUALITY_DEMO.metaDescription,
  citations: ARTICLE_QUALITY_DEMO.citations,
  faqSection: ARTICLE_QUALITY_DEMO.faqSection,
  jsonLdSchema: ARTICLE_QUALITY_DEMO.jsonLdSchema,
  internalLinkSuggestions: ARTICLE_QUALITY_DEMO.internalLinkSuggestions,
  wordCount: ARTICLE_QUALITY_DEMO.wordCount,
}).total;
