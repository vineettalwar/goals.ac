# SEO chat (product control plane)

Chat is the conversational surface for the existing employee loop. It is not a second planner, not a mascot pipeline, and not a general assistant. Substantive turns call `runAgentLoop` with **hybrid** tool choice (rapid JSON pick, illegal/fail → deterministic planner). Autopilot and approval-resume stay deterministic.

Playbook state lives on `seo_chat_threads.playbook_state`. The next user message is an answer while a playbook is active.

## Mapping

| Chat | AgentLoop |
|---|---|
| Substantive turn | `runSeoChatTurn` → `executeStoredAgentRun` (`plannerMode: hybrid`) |
| Onboard (URL / “new project”, including no site selected) | `onboard` playbook: name → vertical → project + scrape → goal/audience/competitors → voice → GSC/WP deep-links → learn summary → topics |
| “What’s slipping?” / CTR gaps | `opportunity_scan` (GSC + Action Queue upsert) |
| “Brief for {keyword}” / “create content about {keyword}” / long pasted prompt | `research_then_draft` with `askBeforeDraft` — research, then wait; Draft this resumes |
| “Relaunch risk for {url}” | `execute_action` + `inspect_url` |
| CTR titles / internal links / backlinks / readiness | `chat_turn` + existing belt tools |
| Strategy / calendar / performance / visibility / GEO / social queue / Autopilot / integrations | Read tools (stored rows only) |
| Generate roadmap / topical map / GEO / visibility / Daily Five / social draft / brand rescan | Write tools wrapping existing generators or jobs |
| “Add to Action Queue” | `chat_turn` + `upsert_action_queue` |
| “Push to WordPress” | Always asks Draft vs Live. Draft runs `publish_cms`. Live is `publish_check` + approve-first `publish_live` |
| In-chat **Approve** on the live gate | Resumes the run (`resumeApproved`) and enqueues `contentPublish` with `cmsStatus: "publish"` |
| “Show trajectory” | Reads `seo_chat_threads.last_agent_run_id` → `agent_runs.trajectory` |
| Empty state | `chatCapabilityPrompts(surface)` — GEO/Social/Research hidden on `blog_wordpress` |
| Grounding | LLM streamed reply from a verified-only pack; fallback `composeGroundedReply`. Unverified numbers are labeled; invented click counts are rejected |

Default `chat_turn` loads `site_context` then lets the hybrid planner pick. It does **not** dump GSC + keywords + competitors unless asked.

Studio / Autopilot / Daily Five still auto-draft after research (`askBeforeDraft` unset).

Messages persist on `seo_chat_messages` (`agent_run_id` when a loop ran). Project memory is `project_chat_memory` (voice notes, banned claims, last decisions).

## API

- `GET/POST /api/seo-chat/threads?projectId=`
- `POST /api/seo-chat/threads` with `{ onboard: true, text }` creates a project from a URL, then a thread
- `GET /api/seo-chat/threads/:id`
- `POST /api/seo-chat/threads/:id/messages` — SSE (`user`, `loop_step`, `delta`, `card`, `done`, `error`)
- `GET/PATCH /api/website-projects/:id/chat-memory`

Production: CF read/write workers + `goals-app-ui` `/chat`. Local Docker: Next `/chat` + the same handlers.

## UI

Gemini-style center thread, newsprint/ink tokens, IBM Plex chrome, serif only on draft excerpts. Site picker, grouped capability chips, Draft / Queue / Trajectory, Continue in Studio, Open in Actions, `nav_link` / `choice` / `learn_summary` cards.

Turns that start an AgentLoop emit SSE `run` `{ agentRunId, status }` on the first persist (before tools). The thread’s `last_agent_run_id` is stamped then so Inspect / Show trajectory can bind while the loop is still running. Assistant turns and publish-gate cards open `AgentRunInspector` inline and deep-link to `/search/actions?runId=`.

## Migrations

Postgres `0082_seo_chat.sql` + `0086_seo_chat_playbook.sql`. D1 `0017_seo_chat.sql` + `0021_seo_chat_playbook.sql`.

```sh
set -a && . ./.env && set +a
pnpm --filter @workspace/db run migrate
# D1 local:
pnpm run cf:migrate:d1:local
```

## Stubbed / honest limits

- GSC and LinkedIn OAuth stay deep-links (no in-chat OAuth).
- Social drafts from chat stay **draft**. Live social post is not a chat tool.
- Autopilot status is read-only. Chat does not enable unattended spend.
- Morning digest, export/share, voice, billing, and admin remain out of scope (P2).
