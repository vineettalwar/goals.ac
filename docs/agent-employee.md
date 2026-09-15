# AI employee loop (not mascot pipelines)

An employee run is a persisted `AgentLoop`: a goal, a tool registry, a step/credit budget, and a trajectory. It is not Owl → Ferret → … named prompt stages.

## Real path (this change)

1. **Opportunity** — GSC scoring (`scoreGscQueries`: striking distance, CTR gaps, etc.) plus existing decay/rank/AI-miss rows land in `agent_action_items`. Weekly keyword/decay sweeps call `syncActionQueueFromSignals`. UI: Search → Actions, or `POST /api/website-projects/:id/agent-actions/sync`.
2. **Trajectory** — `agent_runs.trajectory` stores each tool name, args summary, evidence refs, and planner decision. The loop writes after every step.
3. **Draft** — action types `new_content` / `refresh` / `ctr_title` may call `generate_draft` **after** verified tool evidence exists. Generator is the existing studio `generateContentPiece` (single-shot), not the animal pipeline.
4. **Gate** — `publish_live` is `publish_live` risk. Default policy is approve-first; the tool never executes unless `allowLivePublish` is explicitly true.
5. **Publish** — not auto-live. Approve in the action queue, then use the existing CMS publish routes.

`verified: true` is stripped unless the tool set `hasToolEvidence` and returned matching refs.

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
| `generate_draft` | studio generator when the worker injects it |
| `publish_live` | gated |

## Stubbed / follow-on

- **Phase C:** Studio generate + Autopilot/Daily Five still have a dual path (animal team vs single-shot). They are not yet forced through `runAgentLoop`.
- **Phase D:** post-publish measure jobs and auto-opening refresh actions from slip are not scheduled as a new measure worker; decay/GSC sync already exist and feed the action queue.
- MCP catalog does not yet expose `gsc_query` as its own MCP tool; the loop calls the same DB/services MCP uses.
- Trajectory UI is the Actions page “Trajectory” button, not a rich job inspector.

## API

- `GET /api/website-projects/:id/agent-actions`
- `POST /api/website-projects/:id/agent-actions/sync` → queues `agent-loop` (`opportunity_scan`)
- `POST /api/website-projects/:id/agent-actions/:actionId/run` → queues `agent-loop` (`execute_action`)
- `PATCH /api/website-projects/:id/agent-actions/:actionId` `{ status: approved \| dismissed \| … }`
- `GET /api/website-projects/:id/agent-runs`
- `GET /api/agent-runs/:id`
