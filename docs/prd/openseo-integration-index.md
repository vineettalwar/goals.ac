# OpenSEO → goals.ac integration index

**Status:** Active roadmap (2026-09-06)  
**Decision:** Hybrid — integrate only features that close the WordPress blog loop. See `docs/DECISIONS.md` 2026-09-06.  
**Teardown:** `docs/competitors/open-seo-teardown.md`  
**Upstream:** MIT — attribute substantial ports in DECISIONS / PRD “Sources”.

## Protocol (every feature)

1. Read `HANDOFF.md` → this index → that feature’s PRD.  
2. Re-clone OpenSEO only for paths cited in the PRD.  
3. Smallest vertical slice in `lib/*` + one runnable test.  
4. Wire one UI surface in `marketing-persona-app` / `app-shell`. CF parity only after verified.  
5. Update `HANDOFF.md`. Do **not** start Feature N+1 until N’s success criteria pass.

## Parallel constraint

Go-live Gate 0 (SEC-2 IDOR, BLOCK-3 LinkedIn draft honesty, WP packaging) remains separate. Feature work ships to `lib/*` + Next reference first; do not deploy unfinished audit paths ahead of Gate 0 on live workers.

## Sequence

| # | Feature | PRD | Depends on | Status |
|---|---|---|---|---|
| 1 | Technical site audit | [feature-1-technical-site-audit.md](./feature-1-technical-site-audit.md) | — | **Shipped (lib + Next + CF)** — migrate `0076` / D1 `0011`; smoke live crawl |
| 2 | Real AI visibility (LLM Mentions) | [feature-2-ai-visibility-llm-mentions.md](./feature-2-ai-visibility-llm-mentions.md) | DataForSEO creds / credits | **Shipped (lib + Next)** — migrate `0077` / D1 `0012`; smoke with live keys |
| 3 | goals.ac MCP + agent skills | [feature-3-goals-ac-mcp-skills.md](./feature-3-goals-ac-mcp-skills.md) | Feature 1 for audit tools | **Shipped (lib + Next + CF public)** — `/api/mcp` + skill |
| 4 | GSC URL Inspection | [feature-4-gsc-url-inspection.md](./feature-4-gsc-url-inspection.md) | GSC OAuth | **Shipped (lib + Next + CF)** — migrate `0078` / D1 `0013`; Performance + publish hook + CF GET/POST |
| 5 | Rank tracking hardening | [feature-5-rank-tracking-hardening.md](./feature-5-rank-tracking-hardening.md) | Existing rank jobs | **Shipped (hardening)** — richer SERP features + 45m debounce |
| 6 | Backlinks overview | [feature-6-backlinks-overview.md](./feature-6-backlinks-overview.md) | DataForSEO creds | **Shipped (lib + Next)** — summary + top referring domains on Search → Site |

## Kill / success (product-level)

- **Kill Feature 1** if first-run crawls are blocked without honest “we were blocked” UX.  
- **Kill Feature 2** if DataForSEO LLM Mentions cost cannot be BYOK/credit-gated before default-on.  
- **Done for the program** when Features 1–6 are verified against a real WordPress staging site (live smokes) and HANDOFF lists remaining CF parity explicitly. Code for Features 1–6 is shipped.

## Explicit non-goals

Forking OpenSEO UI · DaisyUI · Autumn · ChatGPT Apps packaging · local SEO · Ahrefs DR scrape · 300 Screaming Frog checks · replacing Content Studio / CMS plugins.
