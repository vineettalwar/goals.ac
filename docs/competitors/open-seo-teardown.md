# OpenSEO teardown (every-app/open-seo)

**Upstream:** https://github.com/every-app/open-seo · **License:** MIT · **Version surveyed:** 0.1.7 (2026-09-06)  
**Positioning:** Open-source Semrush/Ahrefs alternative — SEO *research + measurement* for humans and AI agents. **Not** a content autopilot / CMS publisher.

Re-clone for surgical reads:

```sh
git clone --depth 1 git@github.com:every-app/open-seo.git /tmp/open-seo-research
```

---

## Stack

| Layer | Choice |
|---|---|
| App | TanStack Start + React 19 + Vite 7 + Tailwind 4 + DaisyUI |
| Hosting | Cloudflare Workers (Alchemy), Workflows, Durable Objects, R2, KV |
| DB | Dual dialect: D1/SQLite + Postgres via Drizzle |
| Auth | better-auth (orgs, API keys, OAuth for MCP/GSC/GA4) |
| SEO data | DataForSEO (BYOK or metered hosted + Autumn billing) |
| Agents | MCP server (~46 tools), OpenRouter, Cloudflare Agents (SAM) |

---

## Feature inventory (integration lens)

| Cluster | Upstream paths | Maturity | goals.ac value |
|---|---|---|---|
| Keyword research + saved lists | `src/client/features/keywords/`, `src/server/lib/dataforseo/{labs,serp}.ts`, MCP `research_keywords` | Solid | Med — Semrush BYOK already covers gaps |
| Rank tracking | `src/server/features/rank-tracking/`, `RankCheckWorkflow` | Solid | Med — enhance existing snapshots |
| **Site audit (technical crawl)** | `src/shared/audit-issues.ts`, `src/server/lib/audit/*`, `issues/page-reporters.ts`, `issues/multipage*.ts` | Solid MVP | **High** — largest gap vs GEO single-URL auditor |
| Lighthouse / CWV | `src/server/lib/dataforseo/lighthouse.ts` | Solid | Med — paid; defer as Feature 1b |
| Domain / competitors | Labs + MCP `get_domain_overview`, `find_serp_competitors` | Solid | Med |
| Backlinks | `src/server/lib/dataforseo/backlinks.ts` | Solid research | Low–Med — defer |
| **AI visibility (LLM Mentions)** | `src/server/lib/dataforseo/ai.ts`, `features/ai-search/services/*` | MVP→solid | **High** — goals.ac visibility is simulated |
| MCP + skills | `src/server/mcp/`, `.agents/skills/`, `plugins/openseo/skills/` | Solid differentiator | **High as pattern** |
| Project context / SAM | `features/project-context/`, `features/sam/` | Solid MVP | Med — memory pattern |
| GSC | `features/gsc/`, MCP `inspect_urls` | Solid | **High** — URL Inspection missing |
| GA4 | MCP-heavy analytics tools | Solid | Med |
| Local SEO / GBP | MCP + skill | MVP | **Skip** (B2B pSEO) |

**Explicitly absent upstream:** content generation, humanize, CMS publish, `llms.txt` generators, schema writers, redirect map editor. goals.ac already owns those.

---

## Site audit issue types (port candidates)

Registry: `src/shared/audit-issues.ts` — severity + title + explanation + `howToFix`.

Critical/warning highlights: `blocked-page`, `server-error`, `broken-internal-link`, `missing-title`, `broken-page`, `duplicate-title`, `duplicate-meta-description`, `duplicate-content`, `missing-meta-description`, `missing-h1`, `multiple-h1`, `redirect-chain`, `redirect-loop`, `canonical-conflict`, `thin-content`, `images-missing-alt`, `orphan-page`, `no-outgoing-links`.

Info: title/meta length, heading-order-skip, slow-response, noindex-page, canonicalized-page, deep-page.

**Port rule:** algorithms + issue copy (adapt UA string to `GoalsAc-Audit`). Do **not** port Cloudflare Workflow / Durable Object scratchpad control plane — run on pg-boss / jobs worker.

Architecture notes worth reading: `docs/site-audit-pm-research.md`, `specs/0009-site-audit-crawl-architecture.md`.

---

## MCP tool clusters (46)

Meta · project context · keywords · SERP/competitors · domain/backlinks · rank tracking · site audit · GSC · GA4 · local.  
**Gap vs product UI:** AI Brand Lookup / Prompt Explorer have **no** MCP tools yet.

---

## What not to copy

1. Autumn + 28% DataForSEO markup billing  
2. DaisyUI visual system (goals.ac uses paper/forest-green)  
3. Dual D1↔Postgres machinery (goals.ac has its own)  
4. Alchemy Workflow/DO audit orchestration  
5. ChatGPT Apps SDK packaging  
6. Ahrefs free DR scraper (ToS / brittle)  
7. Local SEO stack  
8. Full Semrush-clone UI surface  

---

## Confidence

~85% from README, schemas, feature dirs, MCP registry, and PM docs. Runtime crawls not exercised in this survey.
