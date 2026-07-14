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
  {
    slug: "llm-visibility-playbook",
    title: "LLM Visibility Playbook for B2B",
    description: "Weekly workflow to improve AI citation rates.",
    cta: { label: "Track visibility", href: "/llm-visibility" },
    body: `1. Define 10–20 buyer prompts your ICP asks AI assistants
2. Run baseline visibility snapshots in goals.ac
3. Fix GEO audit issues (schema, FAQ, llms.txt)
4. Publish pillar + supporting content on gap clusters
5. Re-track weekly and note which pages get cited

Pair LLM visibility with GSC and GA4 article performance for full-funnel reporting.`,
  },
  {
    slug: "gsc-ga4-article-roi",
    title: "Measuring Article ROI with GSC + GA4",
    description: "Join clicks and on-site engagement per published piece.",
    cta: { label: "Search analytics", href: "/search-analytics" },
    body: `Connect Google Search Console and GA4 per project in **Integrations**.

goals.ac joins GSC page URLs to \`content_pieces.published_url\` so you see:
- Clicks and impressions (GSC)
- Sessions, bounce rate, engagement (GA4)

Use this in monthly client reports to justify content investment.`,
  },
  {
    slug: "wordpress-gutenberg-elementor",
    title: "CMS Output Formats: WordPress, Ghost, Drupal, TYPO3, Shopify",
    description: "How goals.ac renders native payloads per platform and editor mode.",
    cta: { label: "CMS publishing", href: "/integrations" },
    body: `Each CMS connection on **Integrations** can set an **output format** — how goals.ac shapes content for that platform's editor:

**WordPress:** Classic HTML, Gutenberg blocks, Elementor JSON, or Divi shortcodes.

**Ghost:** HTML or native Lexical/Koenig cards via the Admin API.

**Drupal:** Body HTML or Layout Builder sections (one column per H2).

**TYPO3:** Single text element or mapped content elements (header, text, textmedia).

**Shopify:** Blog article HTML, article + section metafields, or OS 2.0 page sections.

**Webhook:** Markdown only, HTML only, both, or full canonical JSON (BYOK+).

Change output format inline on a connected integration without disconnecting. Use render preview before publish to verify layout. Schema and llms.txt inject via goals.ac plugins when connected.`,
  },
  {
    slug: "brand-voice-rag",
    title: "Brand Voice RAG and Skill Docs",
    description: "How ingestion and retrieval shape every draft.",
    cta: { label: "Brand voice", href: "/brand-voice" },
    body: `goals.ac ingests your site (sitemap, GSC top pages, CMS site-graph) into chunked embeddings plus an editable **brand voice skill** markdown doc.

At generation time, topic-relevant passages are retrieved alongside structured brand constraints. Review and edit the skill doc in **Project → Brand** without touching prompts.`,
  },
  {
    slug: "social-hub-workflow",
    title: "Social Hub: Compose, Queue, Publish",
    description: "Distribute repurposed content across six OAuth platforms.",
    cta: { label: "Social Hub", href: "/social-distribution" },
    body: `Per project, connect LinkedIn, X, Meta, Bluesky, or Mastodon under **Publishing**.

**Social Hub** provides calendar, composer, and queue views. Repurpose a long-form piece into social variants from Content Studio, then schedule or publish immediately.`,
  },
  {
    slug: "programmatic-seo-location-pages",
    title: "Location Pages and Programmatic SEO",
    description: "When to use location_page format vs pillar content.",
    cta: { label: "Contact us", href: "/contact" },
    body: `The \`location_page\` format targets city × service pages with local schema and FAQ blocks.

Best practices:
- Unique local proof points per page (not duplicate city swaps)
- Strong internal links from a national pillar
- GSC monitoring per URL cluster

Bulk CSV-driven generation is on our roadmap — contact us for engagement scoping.`,
  },
  {
    slug: "schema-json-ld-faq",
    title: "Schema.org JSON-LD and FAQ Blocks",
    description: "Why structured data matters for SEO and GEO.",
    cta: { label: "Free GEO audit", href: "/geo-audit" },
    body: `Every goals.ac draft can include FAQ sections and Article/FAQ JSON-LD. CMS plugins push schema to your site via HMAC-secured endpoints.

AI systems and Google use structured data to understand entities, answers, and citations. Run the free GEO audit to find missing schema on existing pages.`,
  },
  {
    slug: "semrush-byok-keywords",
    title: "Semrush BYOK for Keyword Gaps",
    description: "Bring your own Semrush API key for competitive gap data.",
    cta: { label: "Book discovery call", href: "/contact" },
    body: `Organization admins can add a Semrush API key in **Settings → AI Providers**. Gap discovery caches results 24h to conserve API units.

Without Semrush, goals.ac still surfaces GSC-based opportunities and AI-estimated clusters.`,
  },
  {
    slug: "content-humanizer",
    title: "The Humanizer Pass Explained",
    description: "Optional rewrite for natural voice before editorial review.",
    cta: { label: "Brand voice", href: "/brand-voice" },
    body: `Set humanization to Off, Light, or Strong in **Project → Brand**. Light polishes rhythm; Strong rewrites for a distinctly human read while preserving headings, citations, and schema.

Add a writing sample so the humanizer mimics your cadence.`,
  },
  {
    slug: "api-keys-headless",
    title: "Public API Keys for Headless Pipelines",
    description: "Render preview and publish via gac_ API keys.",
    cta: { label: "Contact us", href: "/contact" },
    body: `Organization admins create \`gac_\` API keys in **Settings** with scopes: render preview, content read, publish write.

Endpoints live at \`/api/v1/\` — connections, content render, and content-piece publish. Ideal for custom CMS pipelines during engagements.`,
  },
  {
    slug: "editorial-review-workflow",
    title: "Editorial Review Before Publish",
    description: "Manual, draft, and live publish modes.",
    cta: { label: "Content Engine", href: "/content-engine" },
    body: `goals.ac never auto-publishes without your configuration. Set project autopilot to manual review, WordPress draft, or live publish.

Every engagement includes editorial oversight — quality scores, citations, and schema are visible before you approve.`,
  },
  {
    slug: "bing-webmaster-setup",
    title: "Bing Webmaster Tools Integration",
    description: "Connect Bing alongside Google Search Console.",
    cta: { label: "Search analytics", href: "/search-analytics" },
    body: `OAuth-connect Bing Webmaster per project under **Integrations → Search properties**. Sync complements GSC data for Microsoft search visibility.`,
  },
  {
    slug: "stock-images-unsplash-pexels",
    title: "Stock Images (Unsplash & Pexels)",
    description: "Copyright-free images sideloaded at publish time.",
    cta: { label: "Features", href: "/features" },
    body: `goals.ac uses Unsplash and Pexels by default. Images are downloaded, optimized to WebP, and uploaded to your CMS at publish — not hotlinked.

Optional org-level BYOK keys raise rate limits. Configure in **Settings** or per-project Brand tab.`,
  },
  {
    slug: "agency-multi-project",
    title: "Running Multiple Client Projects",
    description: "Workspace model for agencies on goals.ac.",
    cta: { label: "For agencies", href: "/for-agencies" },
    body: `Each client site is a **website project** with isolated CMS connections, brand voice, calendars, and autopilot settings.

Agency white-label and reseller billing are on the roadmap — book a discovery call for multi-client program scoping today.`,
  },
  {
    slug: "geo-audit-remediation",
    title: "Fixing GEO Audit Issues",
    description: "Prioritize technical fixes that unblock AI citations.",
    cta: { label: "Run GEO audit", href: "/geo-audit" },
    body: `Start with critical issues: missing title/meta, broken H1 hierarchy, absent schema, no llms.txt.

goals.ac ranks recommendations by severity. Re-run audits after publishing new content or plugin schema injection.`,
  },
];

export function getLearnPost(slug: string): LearnPost | undefined {
  return LEARN_POSTS.find((p) => p.slug === slug);
}
