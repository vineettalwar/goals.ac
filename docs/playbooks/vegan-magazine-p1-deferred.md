# Vegan magazine — P1 deferred (build only after paid usage)

Do **not** build these until the customer is paying and hitting limits documented in [vegan-magazine-go-live.md](./vegan-magazine-go-live.md).

| Item | Trigger to build | Notes |
|---|---|---|
| Bulk “today’s 5” queue | Editor spends >30 min/day clicking generate one-by-one for 2 weeks | Multi-select strategy items → batch enqueue; not autopilot |
| Shorter **news** format | News pieces forced to 1600w + FAQ feel wrong in review | New format type with 400–700w template, optional FAQ off |
| Gemini **grounding** for news | Source-URL guard still insufficient; factual errors in review | News format only; still WP draft |
| Public alerting (Sentry) | Second paying tenant signed | `wrangler tail` until then |
| `articlesPerDay` autopilot | Never for news mix — reconsider only for evergreen-only customers | Product decision gate |

**Status:** Deferred by design at first go-live (Aug 2026).
