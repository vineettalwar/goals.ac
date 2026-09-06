---
name: goals-ac-seo-loop
description: >-
  Agent skill for using the goals.ac MCP. Connect an API key and run the agent-driven 
  SEO loop: list projects → audit → fix via content → readiness. Exposes site audit, 
  keyword discovery, content generation, and publish validation as MCP tools.
---

# goals.ac SEO Loop — Agent Skill

Run a programmatic SEO loop against a goals.ac organization using MCP tools. This skill covers authentication, tool discovery, and the recommended workflow for auditing a site, identifying opportunities, generating content, and validating readiness before publishing.

## When to use

Use this skill when:
- You are an agent orchestrating SEO tasks without opening the goals.ac UI
- You need to audit a website, extract issues, and generate fixes as content
- You want to check publish readiness before landing content on a CMS
- You are building an OpenSEO-style agent that works against goals.ac as its data plane

This is **not** a replacement for Semrush, Screaming Frog, or external keyword research. It focuses on goals.ac's native jobs: site audits, in-project keyword discovery, AI-generated content from brand context, and readiness gates.

## Setup

### 1. Create an API key

1. Log in to goals.ac
2. Go to **Settings → Integrations**
3. Click **+ Create API Key**
4. Name it (e.g., "agent-loop-prod")
5. Grant scopes:
   - `content:read` — list and fetch content pieces, projects, audits
   - `content:generate` — create new content pieces (drafts or enqueued jobs)
   - `publish:write` — (optional) publish pieces to connected destinations
6. Copy the key (starts with `gac_`) and store securely

### 2. Add to Cursor / Codex MCP config

In your Cursor settings or Codex agent config, add the goals.ac MCP server:

```json
{
  "mcpServers": {
    "goals-ac": {
      "url": "http://localhost:3001/api/mcp",
      "headers": {
        "Authorization": "Bearer gac_your_key_here"
      }
    }
  }
}
```

Production: same shape with `"url": "https://app.goals.ac/api/mcp"`.

### 3. Verify connectivity

```bash
# Test MCP discovery
curl -X POST http://localhost:3001/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gac_your_key_here" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# Expected: list of tools (whoami, list_projects, run_site_audit, etc.)
```

## Tool Catalog

All tools use JSON-RPC 2.0 over `POST /api/mcp` with `Authorization: Bearer gac_…` header.

### Identity & Discovery

**`whoami`** — No params. Returns the authenticated user and org context.
- Annotations: `readOnly` (safe to call freely)
- Use for: verifying credentials, checking org plan/credits

**`list_projects`** — Returns `{ id, name, url, created_at }`
- Annotations: `readOnly`
- Params: optional `limit`, `offset`
- Use for: discovering projects in the org; pick a project to audit

**`get_project(id)`** — Fetch full project context: brand info, recent audits, connected CMS
- Annotations: `readOnly`
- Params: `projectId`
- Returns: `{ name, url, brandProfile, lastAuditAt, integrationsConnected }`
- Use for: understanding project scope before running audit

**`get_project_context(projectId)`** — Fetch brand profile, style vector, brand memory (discovery summary)
- Annotations: `readOnly`
- Params: `projectId`
- Use for: informing AI generation with brand voice and site research

### Site Audits

**`run_site_audit(projectId, options?)`** — Launch a crawl; returns immediately with job ID
- Annotations: `destructive` (starts background job; consumes crawl budget)
- Params:
  - `projectId` (required)
  - `sync: true` (optional) — block and return results (for small sites < 50 pages)
  - `depth: 2` (optional) — crawl depth (default 1)
  - `budget: 20` (optional) — max pages (default 20)
- Returns: `{ jobId, status, issueCount? }` (when `sync: true`, includes full results)
- Use for: audit a project and get actionable issues

**`get_audit_issues(projectId, auditId?)`** — Poll audit results
- Annotations: `readOnly`
- Params:
  - `projectId` (required)
  - `auditId` (optional; omit for latest)
- Returns: `{ status: "running" | "done" | "failed", issueCount, issues: [...], completedAt? }`
- Issues include: `{ type, severity, page, description, suggestedFix }`
- Use for: checking audit progress or retrieving completed results

### Keywords & Opportunities

**`list_keyword_opportunities(projectId, options?)`** — Fetch discovered keywords from GSC, Semrush, or internal analysis
- Annotations: `readOnly`
- Params:
  - `projectId` (required)
  - `source: "gsc" | "semrush" | "internal"` (optional; default all)
  - `limit: 20` (optional)
- Returns: `{ id, keyword, volume?, difficulty?, source, suggestedAngle? }`
- Use for: identifying which keywords to target in content generation

### Content Generation

**`generate_content_piece(projectId, params)`** — Create a new content piece (draft or enqueued job)
- Annotations: `destructive` (creates piece; consumes AI credits)
- Params:
  - `projectId` (required)
  - `targetKeyword` (required)
  - `formatType: "article" | "listicle" | "how-to" | "comparison"` (optional; default "article")
  - `sync: true` (optional) — block for full response (use sparingly; budget ~60s)
- Returns: `{ id, status: "generated" | "enqueued", body_markdown?, bodyPreview? }`
- Use for: auto-generate a content piece targeting an opportunity keyword

**`get_publish_readiness(projectId, pieceId)`** — Check if content is ready to publish
- Annotations: `readOnly`
- Params:
  - `projectId` (required)
  - `pieceId` (required)
- Returns: `{ ready: boolean, blockers: [...], scoreExplained: { seo, brand, writing } }`
- Use for: validate content before publishing to avoid incomplete or low-quality posts

**`inspect_url(projectId, inspectionUrl, contentPieceId?)`** — Request a GSC URL inspection for a published URL
- Annotations: `openWorld` (calls Google Search Console API)
- Params:
  - `projectId` (required)
  - `inspectionUrl` (required) — fully-qualified URL matching the GSC property
  - `contentPieceId` (optional) — associate result with a content piece
- Returns: `{ inspection: { verdict, coverageState, indexingState, robotsTxtState, pageFetchState, googleCanonical, lastCrawlTime, ... } }`
- Rate-limited to once per URL per 60 minutes. Returns a friendly error if called too soon.
- Requires GSC connection on the project (Settings → Integrations → Google Search Console)
- Use for: check if a newly published page has been indexed and verify Google's canonical

## Recommended Workflow

1. **Authenticate & discover**
   ```
   Call whoami() → check org credits and plan
   Call list_projects() → pick a project
   Call get_project(projectId) → review brand context and connected CMS
   ```

2. **Audit**
   ```
   Call run_site_audit(projectId, { sync: true })  // small sites
   // or
   Call run_site_audit(projectId) → get jobId
   Poll get_audit_issues(projectId) → wait for status "done"
   ```

3. **Prioritize issues & opportunities**
   ```
   Review audit issues → pick top critical/high-severity items
   Call list_keyword_opportunities(projectId) → get keyword list
   Pick keywords aligned with issues (e.g., "page missing H1" + "unranked keyword about topic X")
   ```

4. **Generate content**
   ```
   For each target keyword:
     Call generate_content_piece(projectId, { 
       targetKeyword: "...", 
       formatType: "article", 
       sync: true 
     })
   ```

5. **Validate & publish**
   ```
   For each generated piece:
     Call get_publish_readiness(projectId, pieceId)
     If ready:
       // Publish via UI or next generation of this MCP
       POST /api/content-pieces/{pieceId}/publish
     Else:
       // Log blockers; optionally re-generate or humanize
   ```

## Cost & Safety

- **Crawl budget:** Each `run_site_audit` consumes crawl credits. Default budget is 20 pages per project per week.
- **AI credits:** Each `generate_content_piece` reserves credits based on format and enqueues a job. Credits are settled when the job completes.
- **Never invent new tools.** This skill exposes only `lib/mcp-server` tools; do not call OpenSEO, DataForSEO, or external provider endpoints directly. All external research is brokered through goals.ac's credentialed integrations.
- **Auth scopes:** Always request minimal scopes (e.g., `content:read` + `content:generate` for generation workflows). `publish:write` is only for agents that auto-publish to connected CMS.

## Troubleshooting

**Authorization Bearer error:**
- Verify `gac_` key is not expired or revoked in Settings → Integrations
- Check header format: `Authorization: Bearer gac_xxxxx` (not `gac_xxxxx` alone)

**`jobId` returns `running` after 30s:**
- Site audits may take 1–5 minutes for large sites. Poll `get_audit_issues` every 10–30 seconds.
- Or rerun with `sync: false` and handle async completion via webhook (not yet exposed in MCP; check goals.ac Events).

**`generate_content_piece` returns "insufficient credits":**
- Org has exhausted monthly AI credit grant. Top up via Settings → Billing → Credit Packs.
- Or use BYOK (Bring Your Own Key) for Gemini/Bedrock if org is on Growth/Scale plan.

**Crawl or generation stalls:**
- Check `get_project(projectId)` to verify CMS connections and brand data are initialized.
- Ensure `REDIS_URL` is set if running multi-instance (cache may be stale).

## Further reading

- **Endpoint reference:** `POST /api/mcp` (JSON-RPC 2.0) — send `{ jsonrpc, id, method, params }`
- **Tool discovery:** `GET /api/mcp` — list available tools and their schemas
- **Goals.ac docs:** [goals.ac Technical Reference](https://docs.goals.ac)
