export type LearnPost = {
  slug: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  body: string;
};

export const LEARN_POSTS: LearnPost[] = [
  {
    slug: "what-is-geo",
    title: "What is Generative Engine Optimization (GEO)?",
    description: "How to optimize content for ChatGPT, Perplexity, Claude, and Google AI Overviews.",
    cta: { label: "Run free GEO audit", href: "/geo-audit" },
    body: `Generative Engine Optimization (GEO) is the practice of structuring your website and content so AI systems can retrieve, understand, and cite it when users ask questions.

Unlike traditional SEO, GEO focuses on:
- **Structured data** — Schema.org JSON-LD, FAQ blocks, clear headings
- **Citation-friendly content** — authoritative sources, statistics, expert framing
- **Technical signals** — llms.txt, clean metadata, crawlable HTML
- **Topical depth** — pillar pages and supporting clusters AI expects from experts

goals.ac bakes GEO into every draft: schema-ready metadata, FAQ sections, and a free audit to find gaps on your existing site.`,
  },
  {
    slug: "get-cited-by-chatgpt",
    title: "How to Get Cited by ChatGPT",
    description: "Practical steps to appear in ChatGPT and AI assistant answers.",
    cta: { label: "Track AI visibility", href: "/llm-visibility" },
    body: `ChatGPT and similar assistants recommend brands they can confidently retrieve from the web. To earn citations:

1. **Own clear topical clusters** — pillar + supporting articles on one subject
2. **Publish evidence-rich content** — data, citations, named frameworks
3. **Fix technical GEO gaps** — schema, meta, llms.txt
4. **Track prompts** — monitor whether your brand appears for buyer questions
5. **Keep publishing consistently** — AI systems favor fresh, maintained sources

goals.ac tracks citation rates across ChatGPT, Perplexity, Claude, and Gemini so you can measure progress week over week.`,
  },
  {
    slug: "internal-links-vs-backlink-exchanges",
    title: "Internal Links vs Backlink Exchanges",
    description: "Why white-hat internal linking beats link exchange networks for long-term authority.",
    cta: { label: "Try Internal Link Hub", href: "/link-building" },
    body: `Some AI SEO tools promise hundreds of backlinks per month through exchange networks. That approach carries real risks:

- Google may treat reciprocal link schemes as manipulative
- Links from unrelated sites dilute topical relevance
- You don't control anchor text or context

**Internal linking** is the white-hat alternative: connect pillar pages to supporting articles with contextual anchors, fix orphan pages, and complete topical clusters. goals.ac Internal Link Hub (Beta) maps your site graph and suggests links per draft — building authority you own.`,
  },
  {
    slug: "content-strategy-vs-autopilot-seo",
    title: "Content Strategy vs Autopilot SEO",
    description: "Why strategy-first beats volume-first for B2B organic growth.",
    cta: { label: "Build a free roadmap", href: "/roadmaps" },
    body: `Autopilot SEO tools optimize for article volume: 30 posts per month, auto-published, minimal review. That works for some use cases — but B2B teams often need:

- A **12-month narrative** tied to product launches and market moves
- **Editorial control** before brand content goes live
- **Inspectable outputs** — quality scores, citations, schema

goals.ac starts with a free growth roadmap, turns it into a 30-day calendar, then generates brief-driven drafts you approve. Autopilot is optional — not mandatory.`,
  },
  {
    slug: "topical-authority-b2b-saas",
    title: "Building Topical Authority for B2B SaaS",
    description: "Cluster maps, content gaps, and the fastest path to ranking.",
    cta: { label: "Contact us", href: "/contact" },
    body: `Topical authority means owning a subject area comprehensively — not one keyword at a time. For B2B SaaS:

1. Pick a **pillar topic** aligned with your ICP's jobs-to-be-done
2. Map **supporting keywords** with search volume and difficulty
3. Identify **gaps** vs competitors and your existing site
4. Publish pillar + supporting sequence with internal links
5. Measure rankings **and** AI citations

goals.ac Topical Map shows cluster coverage, quick-win keywords, and recommended next articles — connected to your content calendar and Autopilot queue.`,
  },
];

export function getLearnPost(slug: string): LearnPost | undefined {
  return LEARN_POSTS.find((p) => p.slug === slug);
}
