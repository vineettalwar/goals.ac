# Feature 1 — Technical Site Audit

**Status:** Shipped (lib + Next + CF) · **Index:** [openseo-integration-index.md](./openseo-integration-index.md)  
**Date:** 2026-09-06

## Problem

GEO audit ([`lib/seo-tools/src/geoAuditor.ts`](../../lib/seo-tools/src/geoAuditor.ts)) scores **one URL** for on-page/GEO signals. After publish, customers still lose to broken internal links, redirect chains, duplicate titles, orphans, and WAF crawl blocks — issues a single-page auditor never sees.

## User story

As a project owner, I can run a multi-page technical crawl of my site (default ≤50 pages), see severity-grouped issues with plain-English fixes and affected URLs, and use critical/warning issues as inputs for content refresh or internal-link work.

## Success criteria

1. Crawl starts from project site URL (or explicit start URL), respects robots.txt (reuse brand crawler rules), discovers via homepage links + sitemap.
2. Returns issues for at least: blocked-page, missing-title, missing-meta-description, missing/multiple H1, thin-content, images-missing-alt, duplicate-title, duplicate-meta-description, duplicate-content, redirect-chain/loop, broken-internal-link, orphan-page (orphan only when crawl exhausted under maxPages).
3. Every issue carries severity + title + explanation + howToFix; blocked pages classified honestly (not as 404).
4. SSRF: every fetch (start + discovered) goes through `assertPublicUrl`; redirects use `redirect: "manual"` + re-validate (citation-verifier pattern).
5. Unit tests for page reporters + duplicate/redirect multipage checks + one assert-based crawl self-check on fixture HTML.
6. Persisted under `site_audits` / `site_audit_pages` / `site_audit_issues`; API list/get/start; UI panel under Search → Site (or Audit sibling).

## Scope in

- Issue registry adapted from OpenSEO `src/shared/audit-issues.ts` (UA → `GoalsAc-Audit`)
- Page analysis via existing `node-html-parser` (already in `@workspace/seo-tools`)
- Page reporters + pure multipage checks (duplicates, redirect chains)
- BFS crawl with maxPages default 50, concurrency ≤5
- Schema PG + D1 mirrors; job `siteAuditCrawl` on pg-boss
- Next API + panel in marketing-persona-app / app-shell

## Scope out (v1)

- Lighthouse / CWV (Feature 1b later)
- JS rendering
- Scheduled audit diffs
- MCP tools (Feature 3)
- Wiring every issue into `keyword_opportunities` (optional stretch: critical broken-link / thin-content only)

## Technical approach

| Piece | Location |
|---|---|
| Issue types | `lib/seo-tools/src/site-audit/issue-types.ts` |
| Analyzer | `lib/seo-tools/src/site-audit/page-analyzer.ts` |
| Reporters | `lib/seo-tools/src/site-audit/page-reporters.ts` |
| Multipage | `lib/seo-tools/src/site-audit/multipage-checks.ts` |
| Crawl runner | `lib/seo-tools/src/site-audit/crawl.ts` |
| Package export | `@workspace/seo-tools/site-audit` |
| Schema | `lib/db/src/schema/site_audits.ts` (+ sqlite mirror) |
| Job | `lib/jobs/src/handlers/siteAuditCrawl.ts` |
| API | `artifacts/marketing-persona-app/src/app/api/website-projects/[id]/site-audits/` |
| UI | Panel beside internal-links / Search → Site |

Reuse: `@workspace/security/ssrf-guard`, brand `robots-txt` helpers, `sitemap-crawl` for seed URLs.

**Do not** port OpenSEO Workflow/DO scratchpad. Persist pages incrementally in the job loop.

## Sources (OpenSEO MIT)

- `/tmp/open-seo-research/src/shared/audit-issues.ts`
- `.../issues/page-reporters.ts`, `multipage-checks.ts`
- `.../page-analyzer.ts` (logic; goals.ac uses node-html-parser not htmlparser2)
- `docs/site-audit-pm-research.md` (blocking posture, orphan gating)

## Edge cases

- WAF challenge / 403 → `blocked-page`, stop treating as broken-page
- Truncated crawl (hit maxPages) → **do not** emit orphan-page
- Non-HTML (PDF) → status/blocked only; skip title/H1 checks
- robots Disallow → skip enqueue; do not fetch

## Kill condition

If customer Cloudflare sites block first-run crawls and the UI does not say so clearly, Feature 1 fails activation — fix classification/copy before adding more issue types.

## Open questions

None blocking. Default maxPages=50; raise later with credits if needed.

## Verify

```sh
npx vitest run lib/seo-tools/src/site-audit
pnpm --filter @workspace/seo-tools exec tsc --noEmit
# After migrate: start audit via API against a public staging site; expect issues rows
```
