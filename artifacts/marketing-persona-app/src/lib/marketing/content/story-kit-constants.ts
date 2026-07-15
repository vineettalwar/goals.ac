/**
 * Partner story kit — empty placeholders only.
 * No named customers, no composite ranges, no invented lift.
 */

export const STORY_SLOT_LABELS = [
  {
    label: "Impressions",
    source: "Google Search Console",
    hint: "Paste a GSC Performance screenshot with date range visible. Leave blank until you have one.",
  },
  {
    label: "AI citations",
    source: "GEO / AI visibility audit",
    hint: "Link a live GEO audit URL. No percentage claims without that source.",
  },
  {
    label: "Authority",
    source: "Third-party DR (cite tool + date)",
    hint: "Screenshot the tool export. Name the tool and date — never invent a delta.",
  },
] as const;

export const PARTNER_SWAP_STEPS = [
  "Fill Results only with exact GSC Performance numbers (date range visible in the shot).",
  "Link a live GEO audit for AI citation % — do not invent a band.",
  "Name the authority tool, metric, and date next to any DR delta.",
  "Keep Verify CTAs pointed at live tooling so reviewers can check sources.",
] as const;

export const VERIFY_CTAS = [
  {
    label: "Verify with GSC",
    href: "/search-analytics",
    desc: "Point reviewers to Search Console (or a screenshot) for impressions and clicks.",
  },
  {
    label: "Verify with GEO audit",
    href: "/geo-audit",
    desc: "Link a live AI-visibility scan instead of a static claim.",
  },
  {
    label: "Compare AI SEO tools",
    href: "/compare/ai-seo-tools",
    desc: "Name the DR tool and date when you cite authority; no invented lift.",
  },
] as const;

/**
 * Markdown template with placeholders only — no fake company names or invented metrics.
 */
export const STORY_KIT_MARKDOWN_TEMPLATE = `# Success Story Template

> **Instructions for partners:**  
> Placeholder template only. Do not publish with fake company names or invented metrics. Replace every \`[PLACEHOLDER]\` with real data from GSC, GEO audits, or third-party authority tools. Leave blank if you do not have the proof yet.

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
