# SEO chat (AgentLoop control plane)

Chat is the conversational surface for the existing employee loop. It is not a second planner, not a mascot pipeline, and not a general assistant.

## Mapping

| Chat | AgentLoop |
|---|---|
| Substantive turn | `runAgentLoop` via `runSeoChatTurn` → `executeStoredAgentRun` |
| “What’s slipping?” / CTR gaps | `opportunity_scan` (GSC + Action Queue upsert) |
| “Brief for {keyword}” / “create content about {keyword}” / Draft this | `research_then_draft` (same Studio generator) |
| “Relaunch risk for {url}” | `execute_action` + `inspect_url` |
| “Add to Action Queue” | `chat_turn` + `upsert_action_queue` |
| “publish live” | `publish_check` (approve-first; `publish_live` stays gated) |
| “Show trajectory” | Reads `seo_chat_threads.last_agent_run_id` → `agent_runs.trajectory` |
| Tool chips | Trajectory tools (`Queried GSC`, `Inspected URL`, …) |
| Grounding | Cite `evidenceRefs` with `verified: true` only; otherwise say missing / not verified |

Messages persist on `seo_chat_messages` (`agent_run_id` when a loop ran). Project memory is `project_chat_memory` (voice notes, banned claims, last decisions).

## API

- `GET/POST /api/seo-chat/threads?projectId=`
- `GET /api/seo-chat/threads/:id`
- `POST /api/seo-chat/threads/:id/messages` — SSE (`user`, `loop_step`, `delta`, `card`, `done`, `error`)
- `GET/PATCH /api/website-projects/:id/chat-memory`

Production: CF read/write workers + `goals-app-ui` `/chat`. Local Docker: Next `/chat` + the same handlers.

## UI

Gemini-style center thread, newsprint/ink tokens, IBM Plex chrome, serif only on draft excerpts. Site picker, suggestion chips, Draft / Queue / Trajectory, Continue in Studio, Open in Actions.

Turns that start an AgentLoop emit SSE `run` `{ agentRunId, status }` on the first persist (before tools). The thread’s `last_agent_run_id` is stamped then so Inspect / Show trajectory can bind while the loop is still running. Assistant turns and publish-gate cards open `AgentRunInspector` inline and deep-link to `/search/actions?runId=`.

## Migrations

Postgres `0082_seo_chat.sql`. D1 `0017_seo_chat.sql`.

```sh
set -a && . ./.env && set +a
pnpm --filter @workspace/db run migrate
# D1 local:
pnpm run cf:migrate:d1:local
```

## Stubbed / honest limits

- Assistant prose is composed from the trajectory (no extra LLM rewrite). Streaming is chunked grounded text + live tool chips.
- In-chat **Approve** on the live-publish gate records a project decision. CMS push is still Studio Publish — same as AgentLoop (`publish_live` does not execute).
- Autopilot-from-chat, morning digest, export/share, and voice are out of scope (P2).
