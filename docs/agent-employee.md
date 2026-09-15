# AI employee loop (not mascot pipelines)

An employee run is a persisted `AgentLoop`: a goal, a tool registry, a step/credit budget, and a trajectory. It is not Owl → Ferret → … named prompt stages.

## Full path

1. **Opportunity** — GSC scoring (`scoreGscQueries`: striking distance, CTR gaps, etc.), GSC position slip (`draftsFromPositionSlip`), plus decay/rank/AI-miss rows from `listRefreshQueueItems`, land in `agent_action_items`.
   - Weekly keyword/decay sweeps call `syncActionQueueFromSignals`.
   - GSC search-analytics sync (cron or post-publish measure) also calls `syncActionQueueFromSignals` so slip/decay become queue items the loop can run.
   - UI: Search → Actions, or `POST /api/website-projects/:id/agent-actions/sync`.
2. **Trajectory** — `agent_runs.trajectory` stores each tool name, args summary, evidence refs, and planner decision. The loop writes after every step. Studio SSE emits `event: agent` `{ type: "loop_step", ... }` for the same steps.
3. **Draft** — Studio generate (CF + Next SSE), Autopilot (`generateFromContentItem` / `content-generate` jobs), and Daily Five all call `runResearchThenDraftLoop` → `runAgentLoop` (`research_then_draft`) with `generate_draft` injected as `generateContentPiece` (streamed in Studio). Same generator, same quality. Caps: Studio `stepBudget 10 / maxCredits 16`; Autopilot/Daily Five jobs `6 / 12`. Action-queue `execute_action` still refuses `generate_draft` without verified tool evidence.
4. **Gate** — `publish_live` is `publish_live` risk. Default policy is approve-first (`allowLivePublish: false`). Autopilot `publishMode: live` still holds pieces with `researchConnected === false` at ready. Regulated verticals stay `pending_review`.
5. **Publish** — human approve + existing CMS publish routes (`content-publish` job / Next publish). The loop does not auto-live-publish.
6. **Measure** — after status `published`, `scheduleMeasureAfterPublish` queues GSC and/or GA4 sync **when those properties are connected**, and WordPress URL inspection when the URL is inspectable. Piece `pieceMetadata.measure` records `{ scheduledAt, gscQueued, ga4Queued, gscConnected, ga4Connected }`.
7. **Refresh** — measure sync + decay sweep upsert Action Queue `refresh` items (slip, click-decline, content_refresh, rank_drop). Running an item is another `runAgentLoop` (`execute_action`).

`verified: true` is stripped unless the tool set `hasToolEvidence` and returned matching refs. Studio still drafts when GSC/keywords are missing; it does not mark those drafts as research-connected.

## Dual-quality path (removed)

`useAgentTeam` / `generateContentPieceWithAgents` is **not** the primary Studio, Autopilot, or Daily Five path. The payload flag is ignored. The animal pipeline remains in the library for the public `generate-with-agents` API only.

## Tools (first-party, same services as MCP)

| Tool | Source |
|---|---|
| `gsc_query` | stored GSC query rows + connection |
| `site_context` | project + brand |
| `keyword_context` | keyword hub / tracked (MCP `list_keyword_opportunities`) |
| `competitor_context` | stored analyses |
| `inspect_url` | GSC URL Inspection (MCP `inspect_url`) |
| `get_backlinks_overview` | DataForSEO (MCP) |
| `publish_readiness` | `assessPublishReadiness` (MCP `get_publish_readiness`) |
| `upsert_action_queue` | persist scored actions |
| `generate_draft` | studio `generateContentPiece` when the worker injects it |
| `publish_live` | gated |

## What works offline vs what needs credentials

| Capability | Offline / no Google | Needs production credentials |
|---|---|---|
| Loop, trajectory, Action Queue UI, draft via `generateContentPiece` | Yes (needs an AI key for the draft itself) | — |
| Verified GSC evidence, GSC scoring, position-slip refresh | No — tools return empty, `researchConnected: false` | Search Console connected + synced rows |
| Post-publish GSC/GA measure jobs | Metadata records `gscQueued: false` / `ga4Queued: false` | GSC and/or GA4 property connected |
| URL Inspection after WP publish | Skipped | GSC + WordPress https URL |
| DataForSEO backlinks tool | Empty | SERP provider configured |
| Live CMS publish | Approval-gated; never executed by default policy | CMS credentials + human approve |

## Remaining gaps

- MCP catalog does not yet expose `gsc_query` as its own MCP tool; the loop calls the same DB/services MCP uses.
- Trajectory UI is the Actions page “Trajectory” button, Studio SSE `loop_step` events, and **Chat** (`/chat`) tool chips + Show trajectory.
- Public `POST .../generate-with-agents` is still the old named-agent pipeline.

## Chat control plane

See [`docs/seo-chat.md`](seo-chat.md). Each substantive chat turn calls `runAgentLoop` with thread/site context as the goal. Tables: `seo_chat_threads`, `seo_chat_messages`, `project_chat_memory`.

## API

- `GET /api/website-projects/:id/agent-actions`
- `POST /api/website-projects/:id/agent-actions/sync` → queues `agent-loop` (`opportunity_scan`)
- `POST /api/website-projects/:id/agent-actions/:actionId/run` → queues `agent-loop` (`execute_action`)
- `PATCH /api/website-projects/:id/agent-actions/:actionId` `{ status: approved \| dismissed \| … }`
- `GET /api/website-projects/:id/agent-runs`
- `GET /api/agent-runs/:id`
- `GET/POST /api/seo-chat/threads`
- `GET /api/seo-chat/threads/:id`
- `POST /api/seo-chat/threads/:id/messages` (SSE)
- `GET/PATCH /api/website-projects/:id/chat-memory`
