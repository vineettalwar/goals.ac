# PRD: Editor-side internal links

**Status:** Approved by continue (2026-09-06) — implementing MVP  
**Date:** 2026-09-06  
**Related:** [content-refresh-loop.md](./content-refresh-loop.md) appendix #2 · [white-hat-link-strategy.md](../competitors/white-hat-link-strategy.md) · Internal Link Hub (`/search/site`)

---

## Problem

Generate stores `internalLinkSuggestions` in metadata and Enhance *may* weave markdown links, but Studio has no one-click way to place 1–3 real internal links in the draft. The hub is read-only; publish-time planner only does **inbound** write-back to other posts.

## User story

As an editor in Studio, I see suggested internal links that already match phrases in my draft, click **Insert**, and get `[anchor](/slug)` in the body — without rewriting the article.

## Success criteria

| # | Done when |
|---|---|
| 1 | Pure `suggestOutboundInternalLinks` + `applyInternalLinksToMarkdown` (unit-tested) |
| 2 | Quality panel lists up to 3 insertable suggestions while editing |
| 3 | Click / “Insert all” wraps first unlinked phrase; skips already-linked targets |
| 4 | No hub rebuild; no new crawl; no invented anchors that are not in the draft |

## Scope

**In:** Deterministic wrap of existing draft phrases using metadata suggestions (and title-derived matches when provided).  
**Out:** Auto-insert on generate; Surfer-style live NLP; rewriting published posts from the hub; new API unless client apply is insufficient.

## Technical approach

Reuse `normalizeInternalSlug` from `internal-link-validator`. UI reuses quality-panel chip + `onInsertOutline` full-body replace (same as coverage insert path).

## Edge cases

| Case | Behavior |
|---|---|
| Phrase already linked | Skip |
| Slug already used in body | Skip |
| Suggestion phrase absent from draft | Do not invent; omit from insertable list |
| Zero suggestions | Hide section |

## Defaults

- Limit 3 links per apply
- Proceeding on this PRD (user: continue after refresh-loop handoff)
