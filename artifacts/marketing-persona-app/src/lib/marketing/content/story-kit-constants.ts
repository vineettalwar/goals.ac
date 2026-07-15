/**
 * Shared illustrative story kit constants — no named customers or invented metrics.
 * Partners swap illustrative ranges for GSC/GEO/DR screenshots before publishing.
 */

export const ILLUSTRATIVE_PROFILE = {
  framing: "Illustrative engagement profile (anonymized)",
  headline: "B2B SaaS · 12-week content + GEO engagement",
  summary:
    "Composite ranges typical of a mid-funnel program: programmatic SEO pages, internal linking, and an AI-visibility pass. Not a named case study — replace every figure with primary-source screenshots.",
  metrics: [
    {
      label: "Impressions",
      value: "↑ 2–4×",
      source: "Google Search Console",
      hint: "Illustrative 90-day vs prior window. Partner: paste GSC Performance screenshot here.",
    },
    {
      label: "AI citations",
      value: "~8–15%",
      source: "GEO / AI visibility audit",
      hint: "Illustrative share of sampled queries citing the domain. Partner: link live GEO audit.",
    },
    {
      label: "Authority",
      value: "+2–5 pts",
      source: "Third-party DR (cite tool + date)",
      hint: "Illustrative Domain Rating delta. Partner: screenshot the tool export — no invented lift.",
    },
  ],
  partnerSwapSteps: [
    "Replace the ranges above with exact GSC Performance numbers (date range visible in the shot).",
    "Attach or link a GEO audit URL for AI citation % instead of the illustrative band.",
    "Name the authority tool, metric, and date next to the DR delta.",
    "Keep the Verify CTAs pointed at live tooling so reviewers can check sources.",
  ],
} as const;

export const VERIFY_CTAS = [
  {
    label: "Verify with GSC",
    href: "/search-analytics",
    desc: "Partner copy: point reviewers to Search Console (or a screenshot) for impressions and clicks.",
  },
  {
    label: "Verify with GEO audit",
    href: "/geo-audit",
    desc: "Partner copy: link a live AI-visibility scan instead of a static claim.",
  },
  {
    label: "Verify authority score",
    href: "/compare/ai-seo-tools",
    desc: "Partner copy: name the DR tool and date; no invented lift.",
  },
] as const;

/**
 * Markdown template with placeholders only — no fake company names or invented metrics.
 */
export const STORY_KIT_MARKDOWN_TEMPLATE = `# Success Story Template

> **Instructions for partners:**  
> This is a placeholder template only. Do not publish with fake company names or invented metrics. Replace every \`[PLACEHOLDER]\` with real data from GSC, GEO audits, or third-party authority tools.

---

## Client profile

**Company:** \`[COMPANY_NAME]\`  
**Industry:** \`[INDUSTRY]\`  
**Stage:** \`[SEED/SERIES_A/GROWTH/etc.]\`  
**Challenge:** \`[1-2 sentence summary of the SEO / AI visibility problem they wanted to solve]\`

---

## Engagement

**Timeline:** \`[START_DATE]\` to \`[END_DATE]\`  
**Scope:** \`[e.g., 12-week content program, GEO optimization, programmatic SEO pages]\`

---

## Results

### Organic impressions

**Before:** \`[GSC_IMPRESSIONS_BEFORE]\` (date range: \`[DATE_RANGE_BEFORE]\`)  
**After:** \`[GSC_IMPRESSIONS_AFTER]\` (date range: \`[DATE_RANGE_AFTER]\`)  
**Delta:** \`[DELTA_PERCENTAGE]%\` or \`[MULTIPLIER]×\`  
**Source:** Google Search Console (attach screenshot)

### AI visibility

**GEO score:** \`[GEO_SCORE]%\` of sampled queries cite the domain  
**Audit date:** \`[GEO_AUDIT_DATE]\`  
**Source:** Link to live GEO audit or attach export

### Authority / backlinks

**Domain Rating (or similar):** \`[DR_BEFORE]\` → \`[DR_AFTER]\` (+\`[DR_DELTA]\` pts)  
**Tool:** \`[TOOL_NAME]\` (e.g., Ahrefs, Moz, etc.)  
**Date:** \`[MEASUREMENT_DATE]\`  
**Source:** Screenshot of tool export

---

## Verification links

- **GSC screenshot:** \`[LINK_TO_GSC_SCREENSHOT_OR_INLINE_IMAGE]\`
- **GEO audit:** \`[LINK_TO_GEO_AUDIT_URL]\`
- **Authority tool export:** \`[LINK_TO_DR_EXPORT_OR_SCREENSHOT]\`

---

## Client quote (optional)

> "\`[QUOTE_FROM_CLIENT]\`"  
> — \`[CLIENT_NAME]\`, \`[CLIENT_TITLE]\`, \`[COMPANY_NAME]\`

---

**Published by:** \`[PARTNER_ORG_NAME]\`  
**Contact:** \`[PARTNER_EMAIL]\`
`;
