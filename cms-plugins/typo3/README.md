# goals.ac TYPO3 Extension

TYPO3 extension implementing the shared goals.ac HMAC plugin contract.

## Endpoints

- `GET /goals-ac/v1/health` — health check (no auth)
- `GET /goals-ac/v1/site-graph` — HMAC auth, export site content
- `POST /goals-ac/v1/content` — HMAC auth + idempotency, create/update content
- `POST /goals-ac/v1/schema` — HMAC auth, store JSON-LD + llms.txt
- `POST /goals-ac/v1/media` — HMAC auth, upload a base64 image (PNG/JPEG/WebP) into the default FAL storage under `fileadmin/user_upload/goals-ac/`. Body: `filename`, `mime_type`, `data` (base64, raw or `data:image/...;base64,` URI), optional `alt`/`title`/`caption`. Returns `{ id, source_url }` where `id` is the FAL file uid and `source_url` is the site-relative public URL TYPO3 assigns to the file — mirrors the WordPress plugin's `/media` contract.

Uses the shared PHP library from `cms-plugins/shared/` (same contract as WordPress, Drupal, Joomla). FAL import logic (`Classes/Helper/FalImporter.php`) is shared between `ContentPublisher` (inline `textmedia` images) and `MediaController` (standalone uploads).

## Development

Install via Composer path repository pointing at `cms-plugins/shared`, then activate the extension in TYPO3 Extension Manager and configure the site key.
