import { L } from "./integration-landers-types";
import type { IntegrationLander, IntegrationLanderSlug } from "./integration-landers-types";

export const CMS_LANDERS: Record<string, IntegrationLander> = {
  wordpress: L({
    slug: "wordpress",
    brandId: "wordpress",
    label: "WordPress",
    metaTitle: "WordPress SEO Publishing Integration",
    metaDescription:
      "Publish research-backed SEO articles to WordPress with Yoast/Rank Math meta, schema, llms.txt, site-graph internal links, and Gutenberg or Elementor output.",
    badge: "WordPress integration",
    titleLine1: "Publish SEO content",
    titleLine2: "to WordPress",
    description:
      "Connect via Application Password or the goals.ac plugin. Push drafts or live posts with SEO meta, FAQ schema, featured images, and GEO signals — without copy-pasting from a doc.",
    depth: "deep",
    depthLabel: "Deep plugin + REST",
    connectMethods: [
      "goals.ac plugin (HMAC) — health, site-graph, content, schema, llms.txt",
      "Application Password (REST API) — Basic publish without the plugin",
    ],
    capabilities: [
      {
        title: "SEO meta that your plugin understands",
        body: "Title, meta description, and Open Graph map into Yoast, Rank Math, AIOSEO, or SEOPress when active — not a competing meta box.",
      },
      {
        title: "GEO: schema.org + llms.txt",
        body: "JSON-LD and /llms.txt help AI crawlers find priority pages. Schema injection backs off when a major SEO plugin already owns the head.",
      },
      {
        title: "Site graph for internal links",
        body: "The plugin exports your site graph so goals.ac can suggest contextual links that don't nest anchors or break Gutenberg.",
      },
      {
        title: "Builder-aware output",
        body: "HTML for classic/Gutenberg, or Elementor-compatible payloads when Elementor is detected.",
      },
    ],
    setupSteps: [
      "Install the goals.ac WordPress plugin (or use Application Password for Basic REST).",
      "Copy the site key from Settings → goals.ac into project Integrations.",
      "Pick publish-as author and test health.",
      "Publish a draft from Content Studio.",
      "Confirm Yoast/Rank Math fields and schema on the post.",
    ],
    formats: ["Blog posts", "Guides & tutorials", "Pillar pages", "FAQ + Article schema"],
    faq: [
      {
        question: "Do I need the plugin, or is REST enough?",
        answer:
          "REST can create posts (Basic). The plugin unlocks site-graph, HMAC auth, schema/llms.txt, and deeper SEO meta mapping.",
      },
      {
        question: "Will this fight with Yoast or Rank Math?",
        answer:
          "We write into the active SEO plugin's storage and skip our JSON-LD when those plugins already manage schema.",
      },
      {
        question: "Can I publish drafts for review?",
        answer: "Yes — draft or pending, review in wp-admin, then go live.",
      },
      {
        question: "Does Elementor work?",
        answer:
          "When Elementor is active, publish can store Elementor-compatible data so the editor adopts the post.",
      },
    ],
    relatedSlugs: ["ghost", "shopify", "drupal"] as IntegrationLanderSlug[],
  }),

  ghost: L({
    slug: "ghost",
    brandId: "ghost",
    label: "Ghost",
    metaTitle: "Ghost CMS SEO Publishing Integration",
    metaDescription:
      "Publish SEO articles to Ghost with Admin API, Lexical or HTML content, feature images, and meta fields from goals.ac.",
    badge: "Ghost integration",
    titleLine1: "Publish SEO content",
    titleLine2: "to Ghost",
    description:
      "Connect a Ghost Admin API key and push long-form SEO drafts — including feature images and Lexical-native content for Ghost 5.",
    depth: "api",
    depthLabel: "Admin API",
    connectMethods: ["Ghost Admin API key (id:secret)"],
    capabilities: [
      {
        title: "Admin API, not Content API",
        body: "Short-lived JWT against the Admin API so posts can be created and updated.",
      },
      {
        title: "Lexical or HTML body",
        body: "Ghost 5 Lexical JSON for native editor fidelity, or HTML for a simpler payload.",
      },
      {
        title: "Feature images on Ghost CDN",
        body: "Upload featured images so feature_image points at Ghost, not a hotlink.",
      },
      {
        title: "SEO fields on the post",
        body: "Title, slug, excerpt/meta, and tags travel with the article.",
      },
    ],
    setupSteps: [
      "Ghost Admin → Settings → Integrations → Custom Integration.",
      "Paste Admin API key and Admin API URL into goals.ac.",
      "Test connection, publish a draft from Content Studio.",
      "Verify feature image, tags, and meta in Ghost.",
    ],
    formats: ["Blog posts", "Guides", "Pillar / cluster posts"],
    faq: [
      {
        question: "Content API or Admin API?",
        answer: "Publishing needs the Admin API. Content API is read-only.",
      },
      {
        question: "Will Lexical keep headings intact?",
        answer: "Lexical publish stores native nodes so Ghost sees real headings and lists.",
      },
      {
        question: "Can I update an existing post?",
        answer: "Yes — republish with the remote post id to update instead of duplicating.",
      },
    ],
    relatedSlugs: ["wordpress", "webflow", "beehiiv"] as IntegrationLanderSlug[],
  }),

  shopify: L({
    slug: "shopify",
    brandId: "shopify",
    label: "Shopify",
    metaTitle: "Shopify Blog SEO Publishing Integration",
    metaDescription:
      "Publish SEO blog articles to Shopify with Admin GraphQL, staged image upload, and goals.ac plugin or access-token connect.",
    badge: "Shopify integration",
    titleLine1: "Publish SEO content",
    titleLine2: "to Shopify blogs",
    description:
      "Ship research-backed articles into an Online Store blog via Admin GraphQL — with staged image upload and optional HMAC/plugin depth.",
    depth: "deep",
    depthLabel: "Admin GraphQL + plugin",
    connectMethods: [
      "Shopify Admin API access token (write_content)",
      "goals.ac Shopify app / plugin (HMAC)",
    ],
    capabilities: [
      {
        title: "Online Store blog articles",
        body: "Create or update Article resources on a chosen blog (or the first blog if omitted).",
      },
      {
        title: "Staged image upload",
        body: "Featured images go through Shopify staged uploads onto Shopify CDN.",
      },
      {
        title: "Markdown → HTML for themes",
        body: "Long-form Markdown converts to HTML your blog template can render.",
      },
      {
        title: "Commerce-aware clusters",
        body: "Pair product pages with SEO blog clusters from the same brand voice.",
      },
    ],
    setupSteps: [
      "Custom app (or goals.ac) with write_content.",
      "Paste Admin API token into Integrations → Shopify.",
      "Confirm at least one Online Store blog exists.",
      "Optional: set blog GID; else we use the first blog.",
      "Publish a draft and preview on the storefront.",
    ],
    formats: ["Store blog posts", "Buying guides", "Comparison articles"],
    faq: [
      {
        question: "Do I need a blog first?",
        answer: "Yes. Articles belong to a Blog — create one before publishing.",
      },
      {
        question: "Which scopes?",
        answer: "write_content (and read_content). Missing scopes fail clearly.",
      },
      {
        question: "Plugin vs access token?",
        answer:
          "Token covers GraphQL article publish. Plugin/HMAC adds deeper site-graph and GEO workflows.",
      },
    ],
    relatedSlugs: ["wordpress", "hubspot", "wix"] as IntegrationLanderSlug[],
  }),

  notion: L({
    slug: "notion",
    brandId: "notion",
    label: "Notion",
    metaTitle: "Notion Database SEO Publishing Integration",
    metaDescription:
      "Publish SEO drafts into a Notion database as pages — markdown to blocks, https images, tags and status when your DB supports them.",
    badge: "Notion integration",
    titleLine1: "Publish SEO drafts",
    titleLine2: "into Notion",
    description:
      "Share a Notion integration with your content database and push articles as pages — headings, lists, and images as native blocks.",
    depth: "api",
    depthLabel: "Basic API",
    connectMethods: ["Notion integration token + database ID"],
    capabilities: [
      {
        title: "Markdown → Notion blocks",
        body: "H1–H3, lists, code, dividers, paragraphs, inline bold/italic/code.",
      },
      {
        title: "https images only",
        body: "External image blocks and cover from featured https URLs; non-https images are skipped.",
      },
      {
        title: "DB property mapping",
        body: "Maps title, status/select, and multi_select tags when those properties exist.",
      },
      {
        title: "100-block request limit",
        body: "Notion caps children per request — very long pieces may need trimming or a follow-up.",
      },
    ],
    setupSteps: [
      "Create a Notion integration and share it with your database.",
      "Paste the token and database ID into goals.ac.",
      "Publish from Content Studio and open the new page in Notion.",
    ],
    formats: ["Blog drafts", "Briefs", "Editorial wiki pages"],
    faq: [
      {
        question: "Why were images dropped?",
        answer: "Notion only accepts https image URLs as external blocks — data URIs and http are omitted.",
      },
      {
        question: "Can I update an existing page?",
        answer: "Create-only today — republishing creates a new page rather than patching.",
      },
      {
        question: "Why was the body truncated?",
        answer: "Notion limits ~100 blocks per create request for very long articles.",
      },
    ],
    relatedSlugs: ["webflow", "contentful", "webhook"] as IntegrationLanderSlug[],
  }),

  webflow: L({
    slug: "webflow",
    brandId: "webflow",
    label: "Webflow",
    metaTitle: "Webflow CMS SEO Publishing Integration",
    metaDescription:
      "Publish SEO articles into a Webflow CMS collection — markdown to rich text, draft or live, featured image into the first Image field.",
    badge: "Webflow integration",
    titleLine1: "Publish SEO content",
    titleLine2: "to Webflow CMS",
    description:
      "Point goals.ac at a collection and body field slug. We convert Markdown to HTML and create or update CMS items.",
    depth: "api",
    depthLabel: "Basic API",
    connectMethods: ["Site API token + collection ID + body field slug"],
    capabilities: [
      {
        title: "Rich text from Markdown",
        body: "HTML lands in your mapped Rich Text / Plain Text body field.",
      },
      {
        title: "Draft or live",
        body: "Create drafts for designer review or publish live; PATCH by existing item ID.",
      },
      {
        title: "Featured image (https, ≤4MB)",
        body: "Writes into the first Image field when the URL qualifies.",
      },
      {
        title: "Auto slug",
        body: "Slug derived from the title when you don't supply one.",
      },
    ],
    setupSteps: [
      "Generate a Webflow site API token with CMS write access.",
      "Enter collection ID and the body field slug in Integrations.",
      "Publish a draft item, then open it in Webflow Designer/CMS.",
    ],
    formats: ["CMS blog items", "Resource / guide collections"],
    faq: [
      {
        question: "Which field is the body?",
        answer: "You set the body field slug — it must match a Rich Text (or text) field on the collection.",
      },
      {
        question: "Why no featured image?",
        answer: "Image fields need an https URL under 4MB; otherwise we skip the image write.",
      },
      {
        question: "SEO meta fields?",
        answer: "Basic Webflow publish focuses on title/body/slug/image — map SEO fields in Webflow or extend via webhook.",
      },
    ],
    relatedSlugs: ["framer", "wordpress", "contentful"] as IntegrationLanderSlug[],
  }),

  drupal: L({
    slug: "drupal",
    brandId: "drupal",
    label: "Drupal",
    metaTitle: "Drupal SEO Publishing Integration",
    metaDescription:
      "Publish to Drupal via JSON:API or the goals.ac module — HTML body, meta description, tags, and deep plugin site-graph / schema when installed.",
    badge: "Drupal integration",
    titleLine1: "Publish SEO content",
    titleLine2: "to Drupal",
    description:
      "Use JSON:API for Basic publish, or install the goals.ac Drupal module for HMAC auth, site-graph, and schema/llms workflows.",
    depth: "deep",
    depthLabel: "Deep plugin + JSON:API",
    connectMethods: [
      "goals.ac Drupal module (HMAC + site key)",
      "JSON:API basic/bearer credentials",
    ],
    capabilities: [
      {
        title: "JSON:API article body",
        body: "Markdown → HTML into body (full_html); optional field_meta_description and field_tags.",
      },
      {
        title: "Plugin depth",
        body: "Health, content publish, site-graph export, schema inject — same contract as WordPress/Joomla.",
      },
      {
        title: "Layout Builder output (BYOK)",
        body: "Optional layout_builder mode when your site is configured for it.",
      },
      {
        title: "Drafts, updates, categories",
        body: "Plugin health reports drafts/updates/categories/tags/featured_image/schema capabilities.",
      },
    ],
    setupSteps: [
      "Install the goals.ac Drupal module (or configure JSON:API + auth).",
      "Paste site key or API credentials into project Integrations.",
      "Test health, then publish a draft node from Content Studio.",
    ],
    formats: ["Articles / nodes", "Guides", "Pillar content"],
    faq: [
      {
        question: "API vs plugin?",
        answer:
          "JSON:API covers Basic create/update. The module adds HMAC, site-graph, and schema endpoints for GEO.",
      },
      {
        question: "Why is meta description missing?",
        answer: "API path expects field_meta_description when that field exists on the content type.",
      },
      {
        question: "Layout Builder?",
        answer: "Available as an output mode when enabled for the project (BYOK path).",
      },
    ],
    relatedSlugs: ["wordpress", "joomla", "typo3"] as IntegrationLanderSlug[],
  }),

  joomla: L({
    slug: "joomla",
    brandId: "joomla",
    label: "Joomla",
    metaTitle: "Joomla SEO Publishing Integration",
    metaDescription:
      "Publish articles to Joomla via Web Services API or the goals.ac plugin — HTML body, metadesc, tags, featured image URL, and deep GEO endpoints.",
    badge: "Joomla integration",
    titleLine1: "Publish SEO content",
    titleLine2: "to Joomla",
    description:
      "Bearer token for Web Services, or the goals.ac plugin for HMAC publish plus site-graph and schema.",
    depth: "deep",
    depthLabel: "Deep plugin + Web Services",
    connectMethods: [
      "goals.ac Joomla plugin (HMAC)",
      "Joomla Web Services API (Bearer token)",
    ],
    capabilities: [
      {
        title: "articletext + metadesc",
        body: "Markdown → HTML articletext; metadesc capped at 300 chars; tags and category supported.",
      },
      {
        title: "Featured image as https URL",
        body: "Writes into #__content.images — core REST does not upload media binaries.",
      },
      {
        title: "Plugin SEO + schema",
        body: "Plugin path stores SEO meta and can inject schema for GEO.",
      },
      {
        title: "Markdown or pre-rendered HTML",
        body: "Output modes let the plugin convert markdown or accept HTML.",
      },
    ],
    setupSteps: [
      "Enable Web Services + token, or install the goals.ac plugin.",
      "Connect credentials in project Integrations.",
      "Publish a draft article and confirm metadesc in Joomla admin.",
    ],
    formats: ["Joomla articles", "Guides", "Category blogs"],
    faq: [
      {
        question: "Featured image upload?",
        answer: "Pass an https image URL — Joomla core Web Services won't accept a binary upload here.",
      },
      {
        question: "Plugin vs API for SEO?",
        answer: "Plugin path is stronger for SEO meta + schema; API still writes metadesc on create.",
      },
      {
        question: "Token permissions?",
        answer: "The Bearer token needs permission to create/edit articles on the target category.",
      },
    ],
    relatedSlugs: ["wordpress", "drupal", "typo3"] as IntegrationLanderSlug[],
  }),

  webhook: L({
    slug: "webhook",
    brandId: "webhook",
    label: "Webhook",
    metaTitle: "Webhook SEO Content Publishing Integration",
    metaDescription:
      "Receive HMAC-signed goals.ac publish events on Zapier, Make, n8n, or any endpoint — markdown, HTML, FAQ, citations, and JSON-LD in one payload.",
    badge: "Webhook integration",
    titleLine1: "Pipe SEO content",
    titleLine2: "anywhere",
    description:
      "Point a signed webhook at your automation stack. Every publish ships structured content you can route to custom CMS, Slack, or internal tools.",
    depth: "api",
    depthLabel: "Signed webhook",
    connectMethods: ["HTTPS webhook URL + signing secret"],
    capabilities: [
      {
        title: "HMAC-SHA256 signatures",
        body: "X-GoalsAC-Signature verifies authenticity; redirects are rejected.",
      },
      {
        title: "Rich event payload",
        body: "Title, markdown, HTML, metaDescription, keywords, FAQ, citations, jsonLd, status.",
      },
      {
        title: "Output modes",
        body: "both | markdown | html | full canonical — choose what your worker needs.",
      },
      {
        title: "article.publish / article.test",
        body: "Test events let you wire Zapier/Make without publishing live.",
      },
    ],
    setupSteps: [
      "Create an HTTPS endpoint (Zapier Catch Hook, Make, n8n, custom).",
      "Paste URL + signing secret into goals.ac Webhook destination.",
      "Send a test event and verify the signature in your worker.",
      "Publish for real and map fields to your downstream CMS.",
    ],
    formats: ["Any long-form piece", "Automation fan-out"],
    faq: [
      {
        question: "How do I verify the signature?",
        answer: "HMAC-SHA256 of the raw body with your secret; compare to X-GoalsAC-Signature.",
      },
      {
        question: "Why did redirects fail?",
        answer: "We POST only to the configured HTTPS URL — 3xx redirects are not followed.",
      },
      {
        question: "What is \u201cfull\u201d mode?",
        answer: "Includes the canonical content model (FAQ, citations, JSON-LD) alongside body fields.",
      },
    ],
    relatedSlugs: ["notion", "strapi", "wordpress"] as IntegrationLanderSlug[],
  }),
};
