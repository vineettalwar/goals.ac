import { L } from "./integration-landers-types";
import type { IntegrationLander, IntegrationLanderSlug } from "./integration-landers-types";

/** Email / newsletter platform landers. */
export const EMAIL_LANDERS: Record<string, IntegrationLander> = {
  hubspot: L({
    slug: "hubspot",
    brandId: "hubspot",
    label: "HubSpot CMS",
    metaTitle: "HubSpot CMS Blog SEO Publishing Integration",
    metaDescription:
      "Create or update HubSpot CMS blog posts from goals.ac — markdown to HTML postBody, draft or publishImmediately.",
    badge: "HubSpot integration",
    titleLine1: "Publish SEO posts",
    titleLine2: "to HubSpot CMS",
    description:
      "Connect a private app token and blog (content group) ID. Push HTML post bodies as drafts or publish immediately.",
    depth: "api",
    depthLabel: "Basic API",
    connectMethods: ["Private app token + blog contentGroup ID"],
    capabilities: [
      {
        title: "CMS blog posts",
        body: "Markdown → HTML postBody on the selected HubSpot blog.",
      },
      {
        title: "Draft or publishImmediately",
        body: "Keep posts in draft for marketing review or go live in one step.",
      },
      {
        title: "Updates supported",
        body: "Adapter can update existing posts when a remote id is present.",
      },
      {
        title: "Basic meta/image gaps",
        body: "Meta description and featured image aren't passed in the Basic adapter yet.",
      },
    ],
    setupSteps: [
      "Create a HubSpot private app with CMS blog scopes.",
      "Paste token + blog ID into Integrations.",
      "Publish a draft and open it in HubSpot.",
    ],
    formats: ["HubSpot blog posts", "Resource articles"],
    faq: [
      {
        question: "Blog ID vs portal ID?",
        answer: "You need the content group / blog ID, not just the portal ID.",
      },
      {
        question: "Why no meta description?",
        answer: "Basic path focuses on title/body/state — set SEO fields in HubSpot or extend later.",
      },
      {
        question: "Private app scopes?",
        answer: "Need permission to create/edit CMS blog posts.",
      },
    ],
    relatedSlugs: ["wordpress", "mailchimp", "webflow"] as IntegrationLanderSlug[],
  }),

  beehiiv: L({
    slug: "beehiiv",
    brandId: "beehiiv",
    label: "Beehiiv",
    metaTitle: "Beehiiv Newsletter Publishing Integration",
    metaDescription:
      "Create Beehiiv newsletter drafts from goals.ac — markdown to HTML content, always saved as draft for your review.",
    badge: "Beehiiv integration",
    titleLine1: "Draft newsletters",
    titleLine2: "in Beehiiv",
    description:
      "Connect an API key and publication ID. Email-format pieces land as Beehiiv drafts — you send from Beehiiv.",
    depth: "api",
    depthLabel: "ESP API (drafts)",
    connectMethods: ["API key + publication ID"],
    capabilities: [
      {
        title: "HTML newsletter body",
        body: "Markdown → content_html on the publication.",
      },
      {
        title: "Always draft",
        body: "Connector never auto-sends — status is draft for editorial control.",
      },
      {
        title: "Email formats only",
        body: "Matches email_sequence style formats from Content Studio.",
      },
    ],
    setupSteps: [
      "Copy Beehiiv API key + publication ID.",
      "Connect under project Integrations → Email.",
      "Generate an email piece and publish as draft.",
      "Open Beehiiv to review and send.",
    ],
    formats: ["Email sequences", "Newsletter editions"],
    faq: [
      {
        question: "Why is it always a draft?",
        answer: "We never auto-send ESP content — you hit send in Beehiiv after review.",
      },
      {
        question: "Publication ID?",
        answer: "Find it in Beehiiv settings for the publication you want to draft into.",
      },
    ],
    relatedSlugs: ["convertkit", "mailchimp", "ghost"] as IntegrationLanderSlug[],
  }),

  convertkit: L({
    slug: "convertkit",
    brandId: "convertkit",
    label: "ConvertKit",
    metaTitle: "ConvertKit (Kit) Email Publishing Integration",
    metaDescription:
      "Create ConvertKit/Kit email broadcasts from goals.ac — HTML content, public false, ready for you to schedule or send in Kit.",
    badge: "ConvertKit integration",
    titleLine1: "Create broadcasts",
    titleLine2: "in ConvertKit",
    description:
      "Connect your API secret. Studio email pieces become Kit broadcasts (not auto-sent).",
    depth: "api",
    depthLabel: "ESP API (broadcasts)",
    connectMethods: ["API secret (optional formId stored)"],
    capabilities: [
      {
        title: "Broadcast create",
        body: "Subject from title, HTML content, public: false.",
      },
      {
        title: "No auto-send",
        body: "Schedule or send from ConvertKit/Kit after review.",
      },
      {
        title: "Email formats",
        body: "Wired for email-style Content Studio formats.",
      },
    ],
    setupSteps: [
      "Copy your Kit API secret into Integrations.",
      "Publish an email piece as a broadcast draft.",
      "Open Kit to review and send.",
    ],
    formats: ["Email broadcasts", "Sequences (manual send)"],
    faq: [
      {
        question: "Broadcast vs send?",
        answer: "We create the broadcast; sending stays in Kit.",
      },
      {
        question: "Is formId used on publish?",
        answer: "Form ID may be stored for account context; publish creates a broadcast, not a form email.",
      },
    ],
    relatedSlugs: ["beehiiv", "mailchimp", "substack"] as IntegrationLanderSlug[],
  }),

  mailchimp: L({
    slug: "mailchimp",
    brandId: "mailchimp",
    label: "Mailchimp",
    metaTitle: "Mailchimp Campaign Draft Publishing Integration",
    metaDescription:
      "Create Mailchimp campaign drafts from goals.ac — HTML content on your list, ready to review before you send.",
    badge: "Mailchimp integration",
    titleLine1: "Create campaign drafts",
    titleLine2: "in Mailchimp",
    description:
      "Connect API key, server prefix, and list ID. We create a regular campaign and set HTML content — you send from Mailchimp.",
    depth: "api",
    depthLabel: "ESP API (campaign drafts)",
    connectMethods: ["API key + server prefix + audience list ID"],
    capabilities: [
      {
        title: "Campaign + HTML content",
        body: "Creates a regular campaign then PUTs HTML body content.",
      },
      {
        title: "Draft only",
        body: "No send from the connector — review and send in Mailchimp.",
      },
      {
        title: "List required",
        body: "list_id selects the audience for the campaign.",
      },
    ],
    setupSteps: [
      "Create an API key; note dc/server prefix.",
      "Paste key, server, and list ID into Integrations.",
      "Publish an email piece; open the campaign draft in Mailchimp.",
    ],
    formats: ["Email campaigns", "Newsletter drafts"],
    faq: [
      {
        question: "Why aren't campaigns sent?",
        answer: "ESP publish always stops at draft — you send after review.",
      },
      {
        question: "From name / reply-to?",
        answer:
          "Connector currently sets platform defaults; adjust from/reply in Mailchimp before send.",
      },
      {
        question: "Which list?",
        answer: "Use the audience list ID you want the campaign associated with.",
      },
    ],
    relatedSlugs: ["beehiiv", "convertkit", "hubspot"] as IntegrationLanderSlug[],
  }),
};
