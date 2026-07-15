import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Eye,
  FileText,
  Globe,
  Key,
  Link2,
  Map as MapIcon,
  MessageSquare,
  Network,
  PenLine,
  Search,
  Shield,
  Share2,
  Target,
  Zap,
} from "lucide-react";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import {
  CONTACT_HREF,
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
  PRODUCT_CTA_SECONDARY,
  PRODUCT_CTA_SECONDARY_HREF,
} from "@/lib/marketing/site/marketing-contact";

export const PLATFORM_FEATURES = [
  {
    icon: FileText,
    title: "Branded SEO content",
    desc: "Brief-driven articles with your voice, citations, FAQ, and schema. You approve every draft.",
    status: "live" as const,
  },
  {
    icon: MapIcon,
    title: "30-day content strategy",
    desc: "Calendar from keyword research and topical maps, not generic topic lists.",
    status: "live" as const,
  },
  {
    icon: Zap,
    title: "Automated publishing",
    desc: "Autopilot queue with manual, draft, or live publish modes across your CMS.",
    status: "live" as const,
  },
  {
    icon: Link2,
    title: "Internal link hub",
    desc: "Build authority with content clusters and contextual internal links, not link schemes.",
    status: "beta" as const,
  },
  {
    icon: Search,
    title: "Technical GEO audit",
    desc: "Schema, metadata, llms.txt, and page structure fixes for AI crawlers.",
    status: "live" as const,
  },
  {
    icon: MessageSquare,
    title: "Reddit discovery",
    desc: "Find high-intent threads and draft replies. You post manually; we never astroturf.",
    status: "beta" as const,
  },
  {
    icon: Eye,
    title: "LLM visibility tracking",
    desc: "Track brand citations across ChatGPT, Perplexity, Claude, and Gemini.",
    status: "live" as const,
  },
  {
    icon: Share2,
    title: "Social Hub",
    desc: "Compose, schedule, and publish to LinkedIn, X, Meta, Bluesky, and Mastodon.",
    status: "live" as const,
  },
  {
    icon: BarChart3,
    title: "Search analytics",
    desc: "GSC, GA4 article performance, and keyword rank tracking in one hub.",
    status: "live" as const,
  },
  {
    icon: PenLine,
    title: "Brand voice RAG",
    desc: "Ingest your site and docs; retrieve topic-relevant voice at generation time.",
    status: "live" as const,
  },
  {
    icon: Globe,
    title: "Multilingual content",
    desc: "25+ languages today with native-quality output. 50+ locales on our roadmap.",
    status: "beta" as const,
  },
];

export const PLATFORM_FEATURE_PILLARS = [
  {
    title: "Plan",
    featureTitles: ["30-day content strategy", "Branded SEO content"],
  },
  {
    title: "Publish",
    featureTitles: ["Automated publishing", "Social Hub", "Internal link hub", "Multilingual content"],
  },
  {
    title: "Measure",
    featureTitles: ["Technical GEO audit", "LLM visibility tracking", "Search analytics", "Reddit discovery"],
  },
] as const;

export function getPlatformFeaturePillars() {
  const byTitle = new Map(PLATFORM_FEATURES.map((feature) => [feature.title, feature]));
  return PLATFORM_FEATURE_PILLARS.map((pillar) => ({
    title: pillar.title,
    features: pillar.featureTitles.map((title) => byTitle.get(title)).filter((f) => f !== undefined),
  }));
}

export const LANDER_CONFIG = {
  aiVisibility: {
    badge: "AI Visibility",
    titleLine1: "Track when AI",
    titleLine2: "cites your brand",
    description:
      "Monitor citation rates across ChatGPT, Perplexity, Claude, and Gemini. See which competitors appear when you don't.",
    heroImage: HERO_IMAGES.features.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Run GEO audit", href: "/geo-audit" },
    features: [
      { icon: Eye, title: "Multi-engine tracking", description: "Snapshots for ChatGPT, Perplexity, Claude, and Gemini." },
      { icon: BarChart3, title: "Citation trends", description: "Weekly visibility score and competitor mention charts." },
      { icon: BookOpen, title: "Prompt library", description: "Track brand-relevant prompts your buyers actually ask." },
      { icon: Shield, title: "GEO re-audit", description: "Re-run technical audits when visibility drops." },
    ],
    faq: [
      { question: "Which AI engines do you track?", answer: "ChatGPT, Perplexity, Claude, and Gemini with periodic snapshot checks." },
      { question: "Do I need a paid plan?", answer: "Start free and connect your properties. AI visibility tracking is included when you upgrade or join a scoped program." },
    ],
  },
  rankOnChatgpt: {
    badge: "Rank on ChatGPT",
    titleLine1: "Get recommended",
    titleLine2: "by AI assistants",
    description: "Structure content for citation: schema, FAQ, authoritative sources, and topical depth, not keyword stuffing.",
    heroImage: HERO_IMAGES.geoAudit.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Free GEO audit", href: "/geo-audit" },
    features: [
      { icon: Search, title: "GEO-ready drafts", description: "JSON-LD, FAQ blocks, and citation-friendly structure." },
      { icon: Network, title: "Topical authority", description: "Cluster coverage map shows gaps AI systems expect you to own." },
      { icon: Eye, title: "Visibility monitoring", description: "Know when assistants start citing your pages." },
      { icon: FileText, title: "Brand-aligned content", description: "Articles inherit your voice and cross-link your offerings." },
    ],
    faq: [
      { question: "How long until AI citations?", answer: "Typical GEO programs see movement in 4–12 weeks once content publishes and indexes. Timelines vary by niche and site authority." },
      { question: "Is this different from SEO?", answer: "GEO optimizes for AI retrieval and citation. We align both in one workflow." },
    ],
  },
  geo: {
    badge: "Generative Engine Optimization",
    titleLine1: "Optimize for",
    titleLine2: "AI search engines",
    description: "GEO audits find schema gaps, weak metadata, and structure issues that hurt ChatGPT, Perplexity, and Google AI visibility.",
    heroImage: HERO_IMAGES.geoAudit.hero,
    primaryCta: { label: "Run free audit", href: "/geo-audit" },
    secondaryCta: { label: "Learn more", href: "/pricing" },
    features: [
      { icon: Search, title: "Technical scan", description: "Title, meta, H1/H2, Open Graph, and schema.org checks." },
      { icon: Globe, title: "llms.txt support", description: "Generate and inject llms.txt via CMS plugins." },
      { icon: Shield, title: "Issue fixes", description: "Actionable recommendations ranked by severity." },
      { icon: Eye, title: "Visibility tie-in", description: "Connect audit scores to AI citation tracking." },
    ],
    faq: [
      { question: "What is GEO?", answer: "Generative Engine Optimization: improving how AI systems retrieve and cite your content." },
      { question: "Is the audit free?", answer: "Yes. No account required for a basic audit." },
    ],
  },
  contentStrategy: {
    badge: "Content Strategy",
    titleLine1: "30-day calendars",
    titleLine2: "from your research",
    description: "Turn keyword and competitor research into a prioritized 30-day content calendar with formats, owners, and rationale.",
    heroImage: HERO_IMAGES.contentStrategy.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Studio", href: "/content-engine" },
    features: [
      { icon: MapIcon, title: "Research-driven", description: "Every item ties back to search intent and gaps, not random topics." },
      { icon: BarChart3, title: "Competitor-informed", description: "Prioritize gaps competitors already rank for." },
      { icon: Zap, title: "One-click generate", description: "Turn calendar items into briefs and drafts." },
      { icon: Network, title: "Topical clusters", description: "Build pillar + supporting article sequences." },
    ],
    faq: [
      { question: "How is this different from a content calendar tool?", answer: "Items are strategy-backed with SEO/GEO intent, not blank slots." },
    ],
  },
  autopilot: {
    badge: "Content Autopilot",
    titleLine1: "The autopilot engine",
    titleLine2: "inside our programs",
    description:
      "Daily or weekly content generation with manual, draft, or live publish. Included in scoped goals.ac programs, with editorial review before anything goes live.",
    heroImage: HERO_IMAGES.features.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Run free GEO audit", href: "/geo-audit" },
    features: [
      { icon: Zap, title: "Flexible cadence", description: "Daily or weekly runs in your timezone." },
      { icon: Shield, title: "Review queue", description: "Inspect every draft before it goes live." },
      { icon: Globe, title: "CMS publish", description: "WordPress, Shopify, Notion, Ghost, and more." },
      { icon: ClipboardCheck, title: "Quality scores", description: "Per-article scores for structure, citations, and schema." },
    ],
    faq: [
      {
        question: "Can I review before publishing?",
        answer: "Yes. Publish mode is manual or draft by default. Live auto-publish is optional and scoped with your strategist.",
      },
      {
        question: "How do I get access?",
        answer: "Sign up, connect your CMS, and turn on autopilot when you're ready. You choose manual review or draft publish by default.",
      },
    ],
  },
  cmsPublishing: {
    badge: "CMS Publishing",
    titleLine1: "Publish where",
    titleLine2: "you already work",
    description: "Native integrations for 20+ destinations: WordPress, Shopify, headless CMS, ESPs, social, and webhooks.",
    heroImage: HERO_IMAGES.contentEngine.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Engine", href: "/content-engine" },
    features: [
      { icon: Globe, title: "20+ destinations", description: "CMS, ESP, social OAuth, and webhook. More than most AI SEO tools ship." },
      { icon: Link2, title: "Site graph sync", description: "Plugins export internal links for smarter suggestions." },
      { icon: Search, title: "Schema injection", description: "JSON-LD and llms.txt pushed via HMAC-secured plugins." },
      { icon: Zap, title: "Autopilot publish", description: "Schedule drafts to go live automatically." },
    ],
    faq: [
      { question: "Do I need a developer?", answer: "No. Connect via OAuth/API or install our WordPress/Joomla/Drupal plugin in minutes." },
    ],
  },
  linkBuilding: {
    badge: "Link Building",
    status: "beta" as const,
    titleLine1: "Authority without",
    titleLine2: "link schemes",
    description:
      "Build topical authority with internal link clusters and cite-worthy depth. Track link coverage in your dashboard. We don't rent backlinks from exchange networks.",
    heroImage: HERO_IMAGES.geoAudit.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Compare tools", href: "/compare/ai-seo-tools" },
    features: [
      { icon: Network, title: "Internal link graph", description: "See orphan pages, link coverage %, and missing inbound links." },
      { icon: Link2, title: "Contextual suggestions", description: "Anchor text recommendations per draft with applied-link counts." },
      { icon: MapIcon, title: "Cluster completion", description: "Track pillar + supporting article coverage across your site." },
      { icon: Shield, title: "White-hat only", description: "No link exchanges or PBN-style networks." },
    ],
    faq: [
      { question: "Do you build backlinks like exchange networks?", answer: "No. We focus on owned content, internal linking, and topical authority. An outreach playbook is on our roadmap." },
    ],
    waitlistKey: "link-building-playbook",
    waitlistTitle: "Outreach playbook",
  },
  redditVisibility: {
    badge: "Reddit Visibility",
    status: "beta" as const,
    titleLine1: "Find threads",
    titleLine2: "worth joining",
    description:
      "Search Reddit for high-intent discussions in your niche, then get AI draft replies. Manual assist only — you post yourself.",
    heroImage: HERO_IMAGES.roadmaps.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    features: [
      {
        icon: MessageSquare,
        title: "Real thread search",
        description: "Pulls live posts from Reddit public search for your brand keywords — not invented URLs.",
      },
      { icon: Target, title: "Intent scoring", description: "Prioritize threads where buyers ask for recommendations." },
      {
        icon: PenLine,
        title: "Draft replies",
        description: "AI suggested responses to copy and edit. Never posted on your behalf.",
      },
      { icon: Shield, title: "No auto-posting", description: "You own the relationship. We never astroturf." },
    ],
    faq: [
      {
        question: "Do you post to Reddit automatically?",
        answer:
          "No. Threads come from Reddit public search; replies are AI drafts. You copy, edit, and post yourself.",
      },
    ],
  },
  multilingual: {
    badge: "Multilingual",
    status: "beta" as const,
    titleLine1: "25+ languages",
    titleLine2: "today · 50+ soon",
    description: "Generate native-quality B2B content in 25+ languages. Join the waitlist for localized keyword research.",
    heroImage: HERO_IMAGES.features.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    features: [
      { icon: Globe, title: "25+ languages live", description: "English, French, German, Spanish, Italian, Portuguese, Japanese, Korean, Chinese, and more." },
      { icon: PenLine, title: "Brand voice preserved", description: "Tone and glossary apply across languages." },
      { icon: Search, title: "SEO/GEO aligned", description: "Structured output in every locale." },
      { icon: MapIcon, title: "Roadmap locales", description: "50+ languages planned with localized keyword research." },
    ],
    faq: [
      { question: "Which languages are supported?", answer: "25+ today including major European and Asian locales. Localized keyword research is on the roadmap." },
    ],
    waitlistKey: "multilingual-50",
    waitlistTitle: "Additional languages",
  },
  forAgencies: {
    badge: "For Agencies",
    status: "beta" as const,
    titleLine1: "Resell SEO",
    titleLine2: "without building it",
    description: "Manage multiple client projects from one org workspace: partner rollup, BYOK billing, and per-client autopilot queues.",
    heroImage: HERO_IMAGES.pricing.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Studio", href: "/content-engine" },
    features: [
      { icon: Globe, title: "Multi-project", description: "Manage client sites from one workspace with rollup metrics." },
      { icon: Key, title: "BYOK", description: "Clients bring their own AI keys for cost control." },
      { icon: BarChart3, title: "Competitor intel", description: "Competitor analysis across client projects." },
      { icon: Zap, title: "Autopilot per client", description: "Separate queues and CMS connections." },
    ],
    faq: [
      { question: "Is white-label available?", answer: "Full white-label reseller is on the roadmap. Partner workspace is available today for site admins managing multiple client projects." },
      { question: "How do I access the partner dashboard?", answer: "Sign up as a site admin or owner. Partner appears in the sidebar once your org is configured." },
    ],
    waitlistKey: "agency-reseller",
    waitlistTitle: "Agency white-label program",
  },
  socialDistribution: {
    badge: "Social Hub",
    titleLine1: "Distribute content",
    titleLine2: "across social channels",
    description:
      "Compose, queue, and publish to LinkedIn, X, Facebook, Instagram, Bluesky, and Mastodon. Per-platform voice and analytics included.",
    heroImage: HERO_IMAGES.roadmaps.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Engine", href: "/content-engine" },
    features: [
      { icon: Share2, title: "6 platforms", description: "OAuth connections per project for LinkedIn, X, Meta, Bluesky, and Mastodon." },
      { icon: PenLine, title: "Composer + calendar", description: "Draft posts, schedule queues, and recycle evergreen content." },
      { icon: BarChart3, title: "Post analytics", description: "Track engagement and sync history into brand voice." },
      { icon: Zap, title: "Repurpose from articles", description: "Turn long-form drafts into social variants in one click." },
    ],
    faq: [
      { question: "Is this included in engagements?", answer: "Yes. Social Hub is part of the goals.ac platform in scoped programs." },
    ],
  },
  searchAnalytics: {
    badge: "Search Analytics",
    titleLine1: "Measure what",
    titleLine2: "content delivers",
    description:
      "Connect Google Search Console, Bing Webmaster, and GA4. Track keywords, article ROI, and rank movement in one place.",
    heroImage: HERO_IMAGES.geoAudit.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Free GEO audit", href: "/geo-audit" },
    features: [
      { icon: BarChart3, title: "GSC + GA4 join", description: "Clicks and on-site engagement per published article." },
      { icon: Search, title: "Keyword tracking", description: "Rank snapshots and alerts when DataForSEO is configured." },
      { icon: Target, title: "Opportunity scoring", description: "GSC gaps and Semrush BYOK for competitive keywords." },
      { icon: Eye, title: "AI visibility tie-in", description: "Connect search performance with LLM citation trends." },
    ],
    faq: [
      { question: "Do I need separate tools?", answer: "No. Search analytics is built into goals.ac. We connect your properties via OAuth." },
    ],
  },
  brandVoice: {
    badge: "Brand Voice",
    titleLine1: "Content that sounds",
    titleLine2: "like your team",
    description:
      "Scrape your site, ingest CMS posts, and build a RAG-backed voice skill doc. Every draft inherits your tone, glossary, and positioning.",
    heroImage: HERO_IMAGES.contentEngine.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Engine", href: "/content-engine" },
    features: [
      { icon: PenLine, title: "Editable skill doc", description: "Non-technical reviewers can edit the voice guide in markdown." },
      { icon: BookOpen, title: "Topic-aware RAG", description: "Retrieve relevant passages per keyword and format at generation." },
      { icon: Globe, title: "Multi-source ingest", description: "Sitemap, GSC top pages, CMS site-graph, and social history." },
      { icon: Shield, title: "Humanizer pass", description: "Optional rewrite for natural cadence before you approve." },
    ],
    faq: [
      { question: "How long does brand setup take?", answer: "Most projects complete an initial brand scan in under 10 minutes during onboarding." },
    ],
  },
};
