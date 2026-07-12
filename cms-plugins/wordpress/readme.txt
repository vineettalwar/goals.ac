=== goals.ac ===
Contributors: goalsac
Tags: ai, content, seo, schema, geo
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 8.1
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connect your WordPress site to goals.ac — receive AI-generated content, inject schema.org and llms.txt for GEO, and export your site graph for internal linking.

== Description ==

The goals.ac plugin turns your WordPress site into a first-class participant in the goals.ac content pipeline.

**Features:**

* **Site Graph Export** — shares your post taxonomy and internal link structure with goals.ac, powering smarter internal linking suggestions.
* **Content Receive** — accept AI-generated posts from goals.ac as drafts or published, with idempotent delivery (no duplicates on retry).
* **Schema.org Injection** — automatically inject JSON-LD structured data into your pages for better search engine understanding.
* **llms.txt** — serve a `/llms.txt` file for AI search engines (ChatGPT, Claude, Perplexity) to understand your site.
* **HMAC Authentication** — all communication is secured with HMAC-SHA256 request signing with replay protection.

== Installation ==

1. Upload the `goals-ac` folder to `/wp-content/plugins/`.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to Settings → goals.ac to find your site key.
4. Enter the site key in your goals.ac dashboard to pair the site.

== Frequently Asked Questions ==

= How does authentication work? =

All requests from goals.ac to your site are signed with HMAC-SHA256 using a shared site key. Each request includes a timestamp and nonce to prevent replay attacks.

= What is llms.txt? =

llms.txt is a proposed standard for helping AI search engines understand your site content. The plugin serves it at `/llms.txt` when configured via the goals.ac dashboard.

= Does this plugin collect data? =

No. The plugin only responds to incoming requests from goals.ac. It does not phone home or collect any analytics.

== Changelog ==

= 0.1.0 =
* Initial release.
* REST API endpoints: health, site-graph, content, schema.
* HMAC authentication with replay protection.
* Idempotent content publishing.
* JSON-LD schema injection.
* llms.txt serving.
