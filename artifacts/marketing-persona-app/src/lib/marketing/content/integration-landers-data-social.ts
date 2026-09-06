import { L } from "./integration-landers-types";
import type { IntegrationLander, IntegrationLanderSlug } from "./integration-landers-types";

/** Social media and export-only platform landers. */
export const SOCIAL_LANDERS: Record<string, IntegrationLander> = {
  linkedin: L({
    slug: "linkedin",
    brandId: "linkedin",
    label: "LinkedIn",
    metaTitle: "LinkedIn Post Publishing Integration",
    metaDescription:
      "Publish LinkedIn posts from goals.ac Content Studio via OAuth — plain-text from markdown, optional image upload, member or organization author.",
    badge: "LinkedIn integration",
    titleLine1: "Publish posts",
    titleLine2: "to LinkedIn",
    description:
      "Connect LinkedIn OAuth once. Turn studio LinkedIn formats into posts with optional images — no copy-paste.",
    depth: "oauth",
    depthLabel: "OAuth",
    connectMethods: ["LinkedIn OAuth (access token + author URN)"],
    capabilities: [
      {
        title: "Markdown → plain text",
        body: "Strips markdown; posts capped around 3,000 characters.",
      },
      {
        title: "Optional image",
        body: "Upload from URL or buffer when the piece includes an image.",
      },
      {
        title: "Visibility",
        body: "PUBLIC or CONNECTIONS depending on publish options.",
      },
      {
        title: "Metrics fetch",
        body: "Engagement metrics can be pulled after publish where API allows.",
      },
    ],
    setupSteps: [
      "Connect LinkedIn under project Integrations → Social.",
      "Create a linkedin_post in Content Studio.",
      "Publish and confirm on your LinkedIn feed.",
    ],
    formats: ["LinkedIn posts", "Repurposed article hooks"],
    faq: [
      {
        question: "Token expired?",
        answer: "Reconnect OAuth from Integrations when LinkedIn returns 401.",
      },
      {
        question: "Character limit?",
        answer: "Body is truncated to LinkedIn's practical limit after markdown strip.",
      },
      {
        question: "Company page?",
        answer: "Author URN determines member vs organization — set during OAuth connect.",
      },
    ],
    relatedSlugs: ["twitter", "facebook", "wordpress"] as IntegrationLanderSlug[],
  }),

  twitter: L({
    slug: "twitter",
    brandId: "twitter",
    label: "X (Twitter)",
    metaTitle: "X Twitter Thread Publishing Integration",
    metaDescription:
      "Publish X/Twitter threads from goals.ac — automatic thread splitting from markdown, OAuth connect, text posts with public metrics.",
    badge: "X integration",
    titleLine1: "Publish threads",
    titleLine2: "to X",
    description:
      "Connect X OAuth and ship twitter_thread formats as numbered or paragraph-split threads.",
    depth: "oauth",
    depthLabel: "OAuth",
    connectMethods: ["X OAuth access token"],
    capabilities: [
      {
        title: "Smart thread split",
        body: "Respects numbered N/ lines, paragraphs, or 280-character chunks.",
      },
      {
        title: "Text posts",
        body: "Connector posts text statuses — no media upload in the current path.",
      },
      {
        title: "Public metrics",
        body: "Pulls public_metrics after publish when available.",
      },
    ],
    setupSteps: [
      "Connect X under Integrations → Social.",
      "Generate a twitter_thread in Content Studio.",
      "Publish and verify the thread on X.",
    ],
    formats: ["Twitter threads", "Single posts"],
    faq: [
      {
        question: "How are threads split?",
        answer: "Numbered lines, blank-line paragraphs, or hard 280 splits — in that preference order.",
      },
      {
        question: "Images?",
        answer: "Current connector is text-only; attach media on X if needed.",
      },
      {
        question: "280 limit?",
        answer: "Each tweet stays within X's character limit after splitting.",
      },
    ],
    relatedSlugs: ["linkedin", "bluesky", "mastodon"] as IntegrationLanderSlug[],
  }),

  instagram: L({
    slug: "instagram",
    brandId: "instagram",
    label: "Instagram",
    metaTitle: "Instagram Post Publishing Integration",
    metaDescription:
      "Publish Instagram posts via Meta OAuth — image required (featured or first markdown image), caption from markdown, Graph API v21.",
    badge: "Instagram integration",
    titleLine1: "Publish posts",
    titleLine2: "to Instagram",
    description:
      "Connect Meta once (Facebook Page + Instagram Business). Instagram publishes need an image — we use featured or the first markdown image.",
    depth: "oauth",
    depthLabel: "Meta OAuth",
    connectMethods: ["Meta OAuth → Page + Instagram Business account"],
    capabilities: [
      {
        title: "Image required",
        body: "IG Graph publish needs an image URL — featured image or first markdown image.",
      },
      {
        title: "Caption from markdown",
        body: "Stripped markdown caption capped around 2,200 characters.",
      },
      {
        title: "Shared Meta connection",
        body: "Same Meta OAuth powers Facebook + Instagram destinations.",
      },
    ],
    setupSteps: [
      "Connect Meta and select the Page linked to your IG Business account.",
      "Create an instagram_post with an image in Content Studio.",
      "Publish and confirm on Instagram.",
    ],
    formats: ["Instagram posts", "Image + caption social"],
    faq: [
      {
        question: "Why do I need an image?",
        answer: "Instagram Graph publishing requires a media URL — text-only posts aren't supported here.",
      },
      {
        question: "Page vs IG account?",
        answer: "The Facebook Page must be linked to an Instagram Business account.",
      },
      {
        question: "One Meta connect for Facebook too?",
        answer: "Yes — one Meta connection covers both Facebook and Instagram publish targets.",
      },
    ],
    relatedSlugs: ["facebook", "linkedin", "shopify"] as IntegrationLanderSlug[],
  }),

  facebook: L({
    slug: "facebook",
    brandId: "facebook",
    label: "Facebook",
    metaTitle: "Facebook Page Publishing Integration",
    metaDescription:
      "Publish Facebook Page posts from goals.ac via Meta OAuth — markdown stripped to page feed text, Graph API v21.",
    badge: "Facebook integration",
    titleLine1: "Publish posts",
    titleLine2: "to Facebook Pages",
    description:
      "Connect Meta OAuth, pick a Page, and publish facebook_post formats to the Page feed.",
    depth: "oauth",
    depthLabel: "Meta OAuth",
    connectMethods: ["Meta OAuth → Facebook Page"],
    capabilities: [
      {
        title: "Page feed text",
        body: "Markdown stripped to plain text (large Graph limit for page posts).",
      },
      {
        title: "Long-lived tokens",
        body: "OAuth exchange stores long-lived Page tokens for publish.",
      },
      {
        title: "Shared with Instagram",
        body: "Same Meta connection can power Instagram when an IG Business account is linked.",
      },
    ],
    setupSteps: [
      "Connect Meta and select the Facebook Page.",
      "Create a facebook_post in Content Studio.",
      "Publish and verify on the Page.",
    ],
    formats: ["Facebook Page posts", "Repurposed social"],
    faq: [
      {
        question: "Personal profile posts?",
        answer: "We publish to Pages via Graph — not personal timeline posting.",
      },
      {
        question: "Instagram too?",
        answer: "Link an IG Business account to the Page to unlock Instagram publish.",
      },
    ],
    relatedSlugs: ["instagram", "linkedin", "twitter"] as IntegrationLanderSlug[],
  }),

  bluesky: L({
    slug: "bluesky",
    brandId: "bluesky",
    label: "Bluesky",
    metaTitle: "Bluesky AT Protocol Publishing Integration",
    metaDescription:
      "Publish Bluesky posts from goals.ac via AT Protocol OAuth — markdown stripped, ~300 character posts, engagement metrics.",
    badge: "Bluesky integration",
    titleLine1: "Publish posts",
    titleLine2: "to Bluesky",
    description:
      "Connect with your Bluesky handle via AT Proto OAuth and ship short-form posts from Content Studio.",
    depth: "oauth",
    depthLabel: "AT Protocol OAuth",
    connectMethods: ["AT Protocol OAuth (handle)"],
    capabilities: [
      {
        title: "Short text posts",
        body: "Markdown stripped and truncated to Bluesky's ~300 character limit.",
      },
      {
        title: "Metrics",
        body: "Likes, replies, reposts when available after publish.",
      },
      {
        title: "No media in connector",
        body: "Text posts only in the current Bluesky publish path.",
      },
    ],
    setupSteps: [
      "Start Bluesky OAuth with your handle from Integrations → Social.",
      "Create a bluesky_post and publish.",
      "Confirm on your Bluesky profile.",
    ],
    formats: ["Bluesky posts", "Short social"],
    faq: [
      {
        question: "Why a handle?",
        answer: "AT Proto OAuth is identity-based — your handle starts the authorize flow.",
      },
      {
        question: "300 character limit?",
        answer: "Posts are truncated to Bluesky's limit after markdown strip.",
      },
      {
        question: "Images?",
        answer: "Not in the current connector — post text from goals.ac, media on Bluesky if needed.",
      },
    ],
    relatedSlugs: ["mastodon", "twitter", "linkedin"] as IntegrationLanderSlug[],
  }),

  mastodon: L({
    slug: "mastodon",
    brandId: "mastodon",
    label: "Mastodon",
    metaTitle: "Mastodon Instance Publishing Integration",
    metaDescription:
      "Publish Mastodon toots from goals.ac — per-instance OAuth, markdown stripped, long posts use CW/spoiler truncation.",
    badge: "Mastodon integration",
    titleLine1: "Publish toots",
    titleLine2: "to Mastodon",
    description:
      "Register against your instance via OAuth and publish mastodon_post formats with sensible long-text handling.",
    depth: "oauth",
    depthLabel: "Instance OAuth",
    connectMethods: ["Mastodon instance OAuth (read + write:statuses)"],
    capabilities: [
      {
        title: "Per-instance app",
        body: "Registers an OAuth app on your instance; stores instance URL + account.",
      },
      {
        title: "Long post handling",
        body: "Over ~500 characters → spoiler/CW + truncated status body.",
      },
      {
        title: "Metrics",
        body: "Favourites, reblogs, replies when the API returns them.",
      },
    ],
    setupSteps: [
      "Enter your instance URL and complete OAuth.",
      "Create a mastodon_post in Content Studio.",
      "Publish and verify on your instance.",
    ],
    formats: ["Toots", "Short social"],
    faq: [
      {
        question: "Which instance URL?",
        answer: "Your home server, e.g. https://mastodon.social — apps are per-instance.",
      },
      {
        question: "Why a content warning on long posts?",
        answer: "We use spoiler text when the status exceeds a safe length for a single toot.",
      },
      {
        question: "Media?",
        answer: "Text statuses only in the current connector.",
      },
    ],
    relatedSlugs: ["bluesky", "twitter", "linkedin"] as IntegrationLanderSlug[],
  }),

  medium: L({
    slug: "medium",
    brandId: "medium",
    label: "Medium",
    metaTitle: "Medium Export from goals.ac",
    metaDescription:
      "Export SEO article markdown from goals.ac for Medium — Medium's write API is deprecated; copy/paste or import from the export panel.",
    badge: "Medium export",
    titleLine1: "Export articles",
    titleLine2: "for Medium",
    description:
      "Medium isn't a live API destination anymore. Export polished Markdown from Content Studio and publish on Medium yourself.",
    depth: "export",
    depthLabel: "Export only",
    connectMethods: ["No API connect — use Content Export panel"],
    capabilities: [
      {
        title: "Markdown export",
        body: "Copy or download article Markdown ready to paste into Medium.",
      },
      {
        title: "Honest limitation",
        body: "Medium's partner write API is deprecated — we don't pretend to auto-publish.",
      },
      {
        title: "Long-form formats",
        body: "Works with blog/guide-style pieces from the studio.",
      },
    ],
    setupSteps: [
      "Open a finished article in Content Studio.",
      "Use Export → Medium / Markdown.",
      "Paste into Medium's editor and publish there.",
    ],
    formats: ["Blog posts", "Guides", "Essays"],
    faq: [
      {
        question: "Why can't I connect Medium?",
        answer: "Medium deprecated third-party write APIs — export is the supported path.",
      },
      {
        question: "Will formatting survive?",
        answer: "Markdown headings/lists paste cleanly; tweak Medium-specific embeds manually.",
      },
    ],
    relatedSlugs: ["substack", "ghost", "wordpress"] as IntegrationLanderSlug[],
  }),

  substack: L({
    slug: "substack",
    brandId: "substack",
    label: "Substack",
    metaTitle: "Substack Export from goals.ac",
    metaDescription:
      "Export newsletter and article markdown from goals.ac for Substack — no public write API; paste from the export panel.",
    badge: "Substack export",
    titleLine1: "Export editions",
    titleLine2: "for Substack",
    description:
      "Substack has no public write API. Export Markdown for posts or newsletters and publish inside Substack.",
    depth: "export",
    depthLabel: "Export only",
    connectMethods: ["No API connect — use Content Export panel"],
    capabilities: [
      {
        title: "Markdown for posts + email",
        body: "Export matches long-form or email formats for Substack paste.",
      },
      {
        title: "No fake 'connected' state",
        body: "Destination is export-only — we won't show a green connect that can't publish.",
      },
      {
        title: "Editorial control",
        body: "You keep Substack's native send/schedule UX.",
      },
    ],
    setupSteps: [
      "Finish the piece in Content Studio.",
      "Export Markdown via the Substack export action.",
      "Paste into Substack and send or schedule.",
    ],
    formats: ["Newsletter editions", "Substack posts"],
    faq: [
      {
        question: "Why no OAuth?",
        answer: "Substack doesn't offer a public write API for third-party publishers.",
      },
      {
        question: "Email + articles?",
        answer: "Export works for both email-style and long-form studio formats.",
      },
    ],
    relatedSlugs: ["medium", "beehiiv", "ghost"] as IntegrationLanderSlug[],
  }),
};
