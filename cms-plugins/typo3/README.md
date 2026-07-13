# goals.ac TYPO3 Extension

TYPO3 extension implementing the shared goals.ac HMAC plugin contract.

## Endpoints

- `GET /goals-ac/v1/health` — health check (no auth)
- `GET /goals-ac/v1/site-graph` — HMAC auth, export site content
- `POST /goals-ac/v1/content` — HMAC auth + idempotency, create/update content
- `POST /goals-ac/v1/schema` — HMAC auth, store JSON-LD + llms.txt

Uses the shared PHP library from `cms-plugins/shared/` (same contract as WordPress, Drupal, Joomla).

## Development

Install via Composer path repository pointing at `cms-plugins/shared`, then activate the extension in TYPO3 Extension Manager and configure the site key.
