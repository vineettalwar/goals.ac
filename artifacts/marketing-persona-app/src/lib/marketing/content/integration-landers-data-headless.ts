import { L } from "./integration-landers-types";
import type { IntegrationLander, IntegrationLanderSlug } from "./integration-landers-types";

/** Headless CMS and website builder landers. */
export const HEADLESS_LANDERS: Record<string, IntegrationLander> = {
  contentful: L({
    slug: "contentful",
    brandId: "contentful",
    label: "Contentful",
    metaTitle: "Contentful SEO Publishing Integration",
    metaDescription:
      "Create Contentful entries from goals.ac — map title, body, slug, and optional meta description fields via the Content Management API.",
    badge: "Contentful integration",
    titleLine1: "Publish SEO entries",
    titleLine2: "to Contentful",
    description:
      "Map your content type fields once. Markdown becomes HTML in the body field; optional publish to make entries live.",
    depth: "api",
    depthLabel: "Basic API",
    connectMethods: [
      "CMA personal access token + space + environment + content type + field map",
    ],
    capabilities: [
      {
        title: "Field-mapped entries",
        body: "Title, body (HTML from Markdown), slug, optional metaDescriptionField.",
      },
      {
        title: "Create + publish",
        body: "Creates the entry; can hit /published when you choose live.",
      },
      {
        title: "FAQ / JSON-LD fields",
        body: "May attach faq/jsonLd into mapped fields when your model has them.",
      },
      {
        title: "Locale en-US",
        body: "Connector writes the en-US locale today.",
      },
    ],
    setupSteps: [
      "Create a CMA token with access to the space.",
      "Map content type and field IDs in Integrations.",
      "Publish a draft entry and open it in Contentful.",
    ],
    formats: ["Blog content types", "Guide entries"],
    faq: [
      {
        question: "Field IDs must match?",
        answer: "Yes — title/body/slug IDs must exist on the content type or create fails.",
      },
      {
        question: "Featured images?",
        answer: "Not wired in the Basic Contentful adapter — add assets in Contentful or via webhook.",
      },
      {
        question: "Other locales?",
        answer: "Current connector writes en-US; multi-locale is a follow-on.",
      },
    ],
    relatedSlugs: ["sanity", "strapi", "webflow"] as IntegrationLanderSlug[],
  }),

  sanity: L({
    slug: "sanity",
    brandId: "sanity",
    label: "Sanity",
    metaTitle: "Sanity CMS SEO Publishing Integration",
    metaDescription:
      "Create Sanity documents from goals.ac drafts — markdown to HTML fields, slug objects, optional meta description via the Mutations API.",
    badge: "Sanity integration",
    titleLine1: "Publish SEO documents",
    titleLine2: "to Sanity",
    description:
      "Point a write token at your project/dataset and document type. We create documents with mapped HTML body fields.",
    depth: "api",
    depthLabel: "Basic API",
    connectMethods: ["Project token + projectId + dataset + document type + field map"],
    capabilities: [
      {
        title: "Mutate create",
        body: "Creates documents with mapped title/body/slug ({_type:'slug'}) fields.",
      },
      {
        title: "Markdown → HTML",
        body: "Body fields receive HTML converted from studio Markdown.",
      },
      {
        title: "Optional meta field",
        body: "metaDescriptionField when present on your schema.",
      },
      {
        title: "Create-focused",
        body: "Status toggles aren't used in the connector — documents are created via mutate.",
      },
    ],
    setupSteps: [
      "Create a token with write access to the dataset.",
      "Map document type and field names in Integrations.",
      "Publish and open the document in Sanity Studio.",
    ],
    formats: ["Article documents", "Guide schemas"],
    faq: [
      {
        question: "Write token required?",
        answer: "Yes — a read-only token cannot create documents.",
      },
      {
        question: "Updates?",
        answer: "Connector path is create-oriented; patch/update is not the default path yet.",
      },
      {
        question: "Portable Text?",
        answer: "Basic path stores HTML strings — use a schema field that accepts HTML or convert in Sanity.",
      },
    ],
    relatedSlugs: ["contentful", "strapi", "webhook"] as IntegrationLanderSlug[],
  }),

  strapi: L({
    slug: "strapi",
    brandId: "strapi",
    label: "Strapi",
    metaTitle: "Strapi SEO Publishing Integration",
    metaDescription:
      "Publish articles to Strapi via REST — markdown to HTML in title/content/slug, draft or live with publishedAt.",
    badge: "Strapi integration",
    titleLine1: "Publish SEO articles",
    titleLine2: "to Strapi",
    description:
      "Connect a Strapi API token and content-type UID. Drafts set publishedAt null; live sets a timestamp.",
    depth: "api",
    depthLabel: "Basic API",
    connectMethods: ["Base URL + API token + content type UID"],
    capabilities: [
      {
        title: "title / content / slug",
        body: "Fixed REST shape: Markdown → HTML into content.",
      },
      {
        title: "Draft vs live",
        body: "Draft keeps publishedAt null; live sets publishedAt.",
      },
      {
        title: "Optional FAQ / JSON-LD",
        body: "Included in fields payload when your content-type accepts them.",
      },
      {
        title: "Assumes collection REST",
        body: "Works with standard Strapi collection type endpoints.",
      },
    ],
    setupSteps: [
      "Create an API token with create permission on the type.",
      "Enter base URL + content-type UID in Integrations.",
      "Publish a draft and confirm in Strapi admin.",
    ],
    formats: ["Articles", "Blog collection types"],
    faq: [
      {
        question: "What is the content-type UID?",
        answer: "e.g. api::article.article — must match your Strapi schema.",
      },
      {
        question: "Custom fields?",
        answer: "Basic path maps title/content/slug; extra fields need a webhook or custom type.",
      },
      {
        question: "Featured image?",
        answer: "Not in the Basic Strapi adapter — upload media in Strapi or extend via webhook.",
      },
    ],
    relatedSlugs: ["contentful", "sanity", "webhook"] as IntegrationLanderSlug[],
  }),

  typo3: L({
    slug: "typo3",
    brandId: "typo3",
    label: "TYPO3",
    metaTitle: "TYPO3 SEO Publishing Integration",
    metaDescription:
      "Publish to TYPO3 with the goals.ac extension — HMAC content endpoints, content elements or body text, and FAL image import.",
    badge: "TYPO3 integration",
    titleLine1: "Publish SEO content",
    titleLine2: "to TYPO3",
    description:
      "TYPO3 is plugin-first: install the goals.ac extension, pair the site key, and push content elements or body text securely.",
    depth: "deep",
    depthLabel: "Deep plugin only",
    connectMethods: ["goals.ac TYPO3 extension (HMAC + site key)"],
    capabilities: [
      {
        title: "Extension contract",
        body: "Health, content, site-graph, schema, and media endpoints on the extension.",
      },
      {
        title: "body_text or content_elements",
        body: "Choose plain body or structured content elements (BYOK mode).",
      },
      {
        title: "FAL image import",
        body: "Featured images can import via FAL from URL or data URI.",
      },
      {
        title: "No bare JSON:API path",
        body: "Publish registry is plugin-only for TYPO3 — no standalone token path.",
      },
    ],
    setupSteps: [
      "Install and activate the goals.ac TYPO3 extension.",
      "Copy the site key into project Integrations → TYPO3.",
      "Pick body_text or content_elements output mode.",
      "Publish a draft and verify in the TYPO3 backend.",
    ],
    formats: ["Pages / content elements", "Article records"],
    faq: [
      {
        question: "Is there an API-only connect?",
        answer: "Not in the current registry — TYPO3 uses the HMAC extension path.",
      },
      {
        question: "body_text vs content_elements?",
        answer: "body_text is simpler HTML/text; content_elements builds structured CE for editors.",
      },
      {
        question: "Schema injection?",
        answer: "The extension can store schema; SaaS auto-inject coverage varies by destination flags.",
      },
    ],
    relatedSlugs: ["drupal", "joomla", "wordpress"] as IntegrationLanderSlug[],
  }),

  wix: L({
    slug: "wix",
    brandId: "wix",
    label: "Wix",
    metaTitle: "Wix Blog SEO Publishing Integration",
    metaDescription:
      "Publish blog posts to Wix via the Blog API — markdown to rich content HTML, draft or published status.",
    badge: "Wix integration",
    titleLine1: "Publish SEO posts",
    titleLine2: "to Wix Blog",
    description:
      "Connect a Wix access token and site ID. We create blog posts with HTML rich content from your studio Markdown.",
    depth: "api",
    depthLabel: "Basic API",
    connectMethods: ["Access token + site ID"],
    capabilities: [
      {
        title: "Blog v3 rich content",
        body: "Markdown → HTML node inside Wix richContent.",
      },
      {
        title: "Draft or PUBLISHED",
        body: "Choose draft for review or publish immediately.",
      },
      {
        title: "Basic depth",
        body: "No featured image / SEO meta write in the Basic adapter — polish in Wix editor as needed.",
      },
    ],
    setupSteps: [
      "Create a Wix API key with Blog write permissions.",
      "Paste token + site ID into Integrations.",
      "Publish a draft and open it in Wix Blog.",
    ],
    formats: ["Wix blog posts", "Guides"],
    faq: [
      {
        question: "Why no SEO meta?",
        answer: "Basic Wix path sends title/body/status — set SEO fields in Wix or extend later.",
      },
      {
        question: "Updates?",
        answer: "Adapter marks updates false — expect create-oriented publishes today.",
      },
      {
        question: "Permissions?",
        answer: "Token needs Blog create permissions for the site.",
      },
    ],
    relatedSlugs: ["squarespace", "shopify", "wordpress"] as IntegrationLanderSlug[],
  }),

  framer: L({
    slug: "framer",
    brandId: "framer",
    label: "Framer",
    metaTitle: "Framer CMS SEO Publishing Integration",
    metaDescription:
      "Publish CMS collection items to Framer — map title and body field slugs, markdown to HTML, draft flag supported.",
    badge: "Framer integration",
    titleLine1: "Publish SEO items",
    titleLine2: "to Framer CMS",
    description:
      "Use a Framer project API token and collection ID. Mapped fields receive HTML converted from Markdown.",
    depth: "api",
    depthLabel: "Basic API",
    connectMethods: ["Project API token + collection ID + title/body field slugs"],
    capabilities: [
      {
        title: "Collection items",
        body: "Creates CMS items with mapped title/body HTML fields.",
      },
      {
        title: "Draft flag",
        body: "Keep items in draft until you're ready to show them on the site.",
      },
      {
        title: "HTML output",
        body: "Fixed HTML output mode for Framer text/rich fields.",
      },
    ],
    setupSteps: [
      "Generate a Framer project API token.",
      "Map collection ID and field slugs in Integrations.",
      "Publish a draft item and confirm in Framer CMS.",
    ],
    formats: ["CMS blog collections", "Resource pages"],
    faq: [
      {
        question: "Field slugs must match?",
        answer: "Yes — title/body slugs must exist on the collection.",
      },
      {
        question: "Images?",
        answer: "Basic Framer path doesn't set image fields — add them in Framer or via webhook.",
      },
      {
        question: "Updates?",
        answer: "Create-oriented Basic publish; patch support is limited.",
      },
    ],
    relatedSlugs: ["webflow", "notion", "webhook"] as IntegrationLanderSlug[],
  }),

  squarespace: L({
    slug: "squarespace",
    brandId: "squarespace",
    label: "Squarespace",
    metaTitle: "Squarespace Blog SEO Publishing Integration",
    metaDescription:
      "Publish blog posts to Squarespace via the Commerce/blogs API — title, slug, HTML body, optional publishOn.",
    badge: "Squarespace integration",
    titleLine1: "Publish SEO posts",
    titleLine2: "to Squarespace",
    description:
      "Connect an API key and blog ID. Markdown becomes HTML in the post body for your Squarespace blog.",
    depth: "api",
    depthLabel: "Basic API",
    connectMethods: ["API key + site/blog ID"],
    capabilities: [
      {
        title: "Blogs API create",
        body: "Title, slug, HTML body; optional publishOn timestamp.",
      },
      {
        title: "Required User-Agent",
        body: "Connector sends User-Agent goals.ac/1.0 as required by Squarespace.",
      },
      {
        title: "Basic depth",
        body: "No featured image / meta / updates in the Basic adapter.",
      },
    ],
    setupSteps: [
      "Create a Squarespace developer API key with blog access.",
      "Paste key + blog ID into Integrations.",
      "Publish and verify on the Squarespace blog.",
    ],
    formats: ["Blog posts", "Guides"],
    faq: [
      {
        question: "Which blog ID?",
        answer: "Use the blog collection ID from Squarespace developer settings for that blog.",
      },
      {
        question: "Draft without publishOn?",
        answer: "Omit publishOn to leave scheduling/publish timing to Squarespace defaults.",
      },
      {
        question: "Featured images?",
        answer: "Not in Basic path — set cover images in the Squarespace editor.",
      },
    ],
    relatedSlugs: ["wix", "wordpress", "webhook"] as IntegrationLanderSlug[],
  }),
};
