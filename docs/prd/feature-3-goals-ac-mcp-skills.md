# Feature 3 — goals.ac MCP + Agent Skills

**Status:** Shipped (lib + Next) · **Index:** [openseo-integration-index.md](./openseo-integration-index.md)  
**Date:** 2026-09-06 · **Depends on:** Feature 1 for audit tools; existing `/api/v1` auth

## Problem

Agents can only use REST. OpenSEO’s wedge is agent-actionable SEO with project context and credit-aware tools. goals.ac should expose **our** jobs (generate, publish readiness, audit, GSC opportunities) — not a Semrush clone MCP.

## User story

As a developer or agency agent, I connect goals.ac MCP (API key) and run “list projects → run site audit → pick critical issue → generate draft article” without opening the UI.

## Success criteria

1. MCP server (Workers or Node) with OAuth/API-key auth reusing `gac_…` keys / scopes.
2. Tools (v1): `list_projects`, `get_project`, `run_site_audit`, `get_audit_issues`, `list_keyword_opportunities`, `generate_content_piece` (or enqueue), `get_publish_readiness`.
3. Tool annotations: readOnly / destructive / openWorld hints (OpenSEO pattern).
4. At least one Cursor/Codex skill markdown under `.agents/skills/goals-ac-seo-loop/` documenting the workflow.
5. Project-scoped context optional (brand summary + last research actions) — thin v1 OK.

## Scope in

- Pattern from OpenSEO `src/server/mcp/` + skill packaging — **not** their keyword/backlink tool catalog
- Map tools onto existing content-engine + site-audit APIs

## Scope out

- ChatGPT Apps SDK submission
- Full OpenSEO tool parity
- SAM Durable Object chat UI

## Kill condition

If MCP auth cannot reuse existing API keys without a second credential system, stop and redesign auth before adding tools.

## Sources

OpenSEO MIT: MCP tool annotations in `chatgpt-app-submission.json`, `src/server/mcp/tools/site-audit-tools.ts`, project-context tools.

## Shipped

| Piece | Where |
|---|---|
| MCP server (JSON-RPC 2.0) | `lib/mcp-server/src/index.ts` — `POST /api/mcp`, `GET /api/mcp` discovery |
| Tools (v0.1) | `whoami`, `list_projects`, `get_project`, `get_project_context`, `run_site_audit`, `get_audit_issues`, `list_keyword_opportunities`, `generate_content_piece`, `get_publish_readiness` |
| Tool annotations | `readOnly` (whoami, list, get), `destructive` (run_site_audit, generate) — OpenSEO-pattern safety hints |
| Next.js API routes | `POST/GET /api/mcp` in `artifacts/marketing-persona-app/src/app/api/mcp/route.ts` |
| Auth | Reuses gac_ API keys from Settings → Integrations; scopes `content:read`, `content:generate`, `publish:write` |
| Cursor skill | `.agents/skills/goals-ac-seo-loop/SKILL.md` — when to use, auth setup, tool catalog, recommended workflow |

## Verify

```sh
# Local (port 3001)
curl -X POST http://localhost:3001/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gac_your_key" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
# Expect: list of 9 tools

# Or test init + discovery
curl -X POST http://localhost:3001/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gac_your_key" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize"}'
```
