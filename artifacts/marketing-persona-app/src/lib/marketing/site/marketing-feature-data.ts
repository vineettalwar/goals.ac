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
  MessageCircle,
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
    icon: MessageCircle,
    title: "SEO Chat",
    desc: "Talk to the desk: onboard from a URL, scan opportunities, draft, queue Actions, approve publish. Grounded replies only — no invented metrics.",
    status: "live" as const,
  },
  {
    icon: FileText,
    title: "Content Studio",
    desc: "Brief → draft → humanize → dual score → CMS publish. Blog through comparison, listicle, and case study — you approve before live.",
    status: "live" as const,
  },
  {
    icon: MapIcon,
    title: "12-month roadmaps",
    desc: "Sequential growth plan from brand facts, GSC, and goals — plus calendar and topical map, not a blank topic list.",
    status: "live" as const,
  },
  {
    icon: Target,
    title: "Action Queue",
    desc: "GSC-grounded opportunities: CTR gaps, slip, decay. Run, approve, or dismiss — then measure what shipped.",
    status: "live" as const,
  },
  {
    icon: Zap,
    title: "Content Autopilot",
    desc: "Daily or weekly cadence on the same Studio path. Manual or draft by default; live auto-publish is optional.",
    status: "live" as const,
  },
  {
    icon: PenLine,
    title: "Optimize existing pages",
    desc: "Diagnose → Fix → Stay: import a live URL, dual score (not Surfer NLP), fix gaps, update WordPress.",
    status: "live" as const,
  },
  {
    icon: Search,
    title: "GEO audit",
    desc: "Single-URL scan: schema, meta, H1, OG, llms.txt, AI robots, citations, citability.",
    status: "live" as const,
  },
  {
    icon: BarChart3,
    title: "Search analytics",
    desc: "GSC + GA4 article performance, keyword opportunities, and rank snapshots when DataForSEO is connected.",
    status: "live" as const,
  },
  {
    icon: Eye,
    title: "LLM visibility",
    desc: "Citation snapshots across ChatGPT, Perplexity, Claude, and Gemini when provider creds are set.",
    status: "live" as const,
  },
  {
    icon: BookOpen,
    title: "Brand voice",
    desc: "Scrape → editable skill doc → topic passages at draft time. Chat and Studio both use it.",
    status: "live" as const,
  },
  {
    icon: Share2,
    title: "Social Hub",
    desc: "Repurpose approved articles to LinkedIn, X, Meta, Bluesky, and Mastodon. You still own the post.",
    status: "live" as const,
  },
  {
    icon: Globe,
    title: "WordPress-first CMS",
    desc: "Deep WordPress publish (plugin, Rank Math, featured image, draft-first). Ghost and Shopify deep; others Basic.",
    status: "live" as const,
  },
  {
    icon: Link2,
    title: "Internal link hub",
    desc: "Clusters and contextual links on publish — not rented backlinks.",
    status: "beta" as const,
  },
  {
    icon: MessageSquare,
    title: "Reddit discovery",
    desc: "Live thread search and draft replies. You post manually; we never astroturf.",
    status: "beta" as const,
  },
  {
    icon: Globe,
    title: "Multilingual drafts",
    desc: "Major locales in beta. Localized keyword research is waitlist — we do not claim native-quality at scale yet.",
    status: "beta" as const,
  },
];

export const PLATFORM_FEATURE_PILLARS = [
  {
    title: "Desk",
    featureTitles: ["SEO Chat", "12-month roadmaps", "Brand voice"],
  },
  {
    title: "Studio",
    featureTitles: ["Content Studio", "Content Autopilot", "WordPress-first CMS", "Optimize existing pages"],
  },
  {
    title: "Measure",
    featureTitles: ["Action Queue", "GEO audit", "Search analytics", "LLM visibility"],
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
    titleLine1: "Know when assistants",
    titleLine2: "cite you — or don't",
    description:
      "Citation snapshots across ChatGPT, Perplexity, Claude, and Gemini when provider creds are set. Pair with GEO audits when visibility slips.",
    heroImage: HERO_IMAGES.features.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Run GEO audit", href: "/geo-audit" },
    features: [
      { icon: Eye, title: "Multi-engine snapshots", description: "Periodic checks for ChatGPT, Perplexity, Claude, and Gemini — not live streaming." },
      { icon: BarChart3, title: "Citation trends", description: "Visibility score and competitor mention charts over time." },
      { icon: BookOpen, title: "Prompt library", description: "Track brand-relevant prompts your buyers actually ask." },
      { icon: Shield, title: "GEO re-audit", description: "Re-run technical page audits when visibility drops." },
    ],
    faq: [
      { question: "Which AI engines do you track?", answer: "ChatGPT, Perplexity, Claude, and Gemini via periodic snapshots when DataForSEO / provider creds are configured." },
      { question: "Do I need a paid plan?", answer: "Request access, connect properties, then track on Growth/Scale or a scoped program. Free GEO audit needs no account." },
    ],
  },
  rankOnChatgpt: {
    badge: "Rank on ChatGPT",
    titleLine1: "Structure pages",
    titleLine2: "worth citing",
    description:
      "GEO-ready Studio drafts: schema, FAQ, citations, and topical depth — then track whether assistants mention you. No keyword stuffing theater.",
    heroImage: HERO_IMAGES.geoAudit.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Free GEO audit", href: "/geo-audit" },
    features: [
      { icon: Search, title: "GEO-ready drafts", description: "JSON-LD, FAQ blocks, and citation-friendly structure from Studio." },
      { icon: Network, title: "Topical map", description: "Cluster coverage shows gaps assistants expect you to own." },
      { icon: Eye, title: "Visibility monitoring", description: "Snapshots when provider creds are set — know when citations move." },
      { icon: FileText, title: "Brand-aligned content", description: "Voice skill doc + approve-before-live on every piece." },
    ],
    faq: [
      { question: "How long until AI citations?", answer: "Often 4–12 weeks after publish and index. Niche and authority matter; we don't invent timelines." },
      { question: "Is this different from SEO?", answer: "GEO targets AI retrieval and citation. The same desk runs classic SEO and GEO together." },
    ],
  },
  geo: {
    badge: "Generative Engine Optimization",
    titleLine1: "Find what blocks",
    titleLine2: "AI citation",
    description:
      "Single-URL GEO audit: schema, meta, H1, OG, llms.txt, AI robots, citations, citability. Free on marketing — same engine in-app.",
    heroImage: HERO_IMAGES.geoAudit.hero,
    primaryCta: { label: "Run free audit", href: "/geo-audit" },
    secondaryCta: { label: "See plans", href: "/pricing" },
    features: [
      { icon: Search, title: "Technical scan", description: "Title, meta, H1/H2, Open Graph, schema.org, and more." },
      { icon: Globe, title: "llms.txt", description: "Detect gaps; push llms.txt via CMS plugins when connected." },
      { icon: Shield, title: "Ranked issues", description: "Recommendations by severity — fix the blockers first." },
      { icon: Eye, title: "Visibility tie-in", description: "Connect scores to LLM citation tracking when creds are set." },
    ],
    faq: [
      { question: "What is GEO?", answer: "Generative Engine Optimization: improving how AI systems retrieve and cite your content." },
      { question: "Is the audit free?", answer: "Yes. No account for a basic single-URL audit." },
    ],
  },
  contentStrategy: {
    badge: "Content Strategy",
    titleLine1: "Roadmaps and calendars",
    titleLine2: "from real research",
    description:
      "12-month roadmaps plus calendar and topical map from brand facts, GSC, and goals — not a blank topic list. Turn items into Studio briefs.",
    heroImage: HERO_IMAGES.contentStrategy.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Studio", href: "/content-engine" },
    features: [
      { icon: MapIcon, title: "12-month roadmap", description: "One sequential plan grounded in brand + search signals." },
      { icon: BarChart3, title: "Competitor-informed", description: "Real crawls when the homepage is reachable; we fail honestly if blocked." },
      { icon: Zap, title: "Into Studio", description: "Calendar items become briefs and drafts on the same generators." },
      { icon: Network, title: "Topical map", description: "Pillar + supporting coverage, not random posts." },
    ],
    faq: [
      { question: "How is this different from a content calendar tool?", answer: "Items carry SEO/GEO intent and feed Studio — not empty slots." },
    ],
  },
  autopilot: {
    badge: "Content Autopilot",
    titleLine1: "Cadence on the",
    titleLine2: "same Studio path",
    description:
      "Daily or weekly generation inside Content Studio. Manual or draft by default. Live auto-publish is optional — not a silent content farm.",
    heroImage: HERO_IMAGES.features.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "See Content Studio", href: "/content-engine" },
    features: [
      { icon: Zap, title: "Flexible cadence", description: "Daily or weekly runs in your timezone." },
      { icon: Shield, title: "Review gates", description: "Inspect every draft before it goes live." },
      { icon: Globe, title: "CMS publish", description: "WordPress-first (draft by default). Ghost and Shopify deep; others Basic." },
      { icon: ClipboardCheck, title: "Dual scores", description: "Editorial + SERP scores on every piece — same as Studio." },
    ],
    faq: [
      {
        question: "Can I review before publishing?",
        answer:
          "Yes. Manual or draft publish is the default. Live auto-publish is optional.",
      },
      {
        question: "Is Autopilot only in consulting programs?",
        answer:
          "No. Turn it on after signup when you're ready. Scoped GEO programs are optional for hands-on help.",
      },
    ],
  },
  cmsPublishing: {
    badge: "CMS Publishing",
    titleLine1: "WordPress first.",
    titleLine2: "Others where you need them.",
    description:
      "Deep WordPress (plugin, Rank Math, featured image, draft-first). Ghost and Shopify deep. Basic publish for headless and site builders. Social after the article.",
    heroImage: HERO_IMAGES.contentEngine.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Studio", href: "/content-engine" },
    features: [
      { icon: Globe, title: "Deep + Basic", description: "WordPress, Ghost, Shopify depth; Basic on headless and site builders." },
      { icon: Link2, title: "Site graph sync", description: "Plugins export internal links for smarter suggestions (beta hub)." },
      { icon: Search, title: "Schema + llms.txt", description: "JSON-LD and llms.txt via HMAC-secured plugins." },
      { icon: Zap, title: "Autopilot-ready", description: "Scheduled Studio queue with review gates; live push optional." },
    ],
    faq: [
      { question: "Do I need a developer?", answer: "Usually no. Connect via OAuth/API or install the WordPress (or Joomla/Drupal) plugin." },
    ],
  },
  linkBuilding: {
    badge: "Link Building",
    status: "beta" as const,
    titleLine1: "Internal authority.",
    titleLine2: "No link schemes.",
    description:
      "Clusters and contextual links on publish — not rented backlinks. Outreach playbook is waitlist.",
    heroImage: HERO_IMAGES.geoAudit.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Compare tools", href: "/compare/ai-seo-tools" },
    features: [
      { icon: Network, title: "Internal link graph", description: "Orphan pages, coverage, and missing inbound links." },
      { icon: Link2, title: "Contextual suggestions", description: "Anchor recommendations per draft with applied-link counts." },
      { icon: MapIcon, title: "Cluster completion", description: "Pillar + supporting coverage across the site." },
      { icon: Shield, title: "White-hat only", description: "No exchanges or PBN-style networks." },
    ],
    faq: [
      { question: "Do you build backlinks like exchange networks?", answer: "No. Owned content, internal linking, topical authority. Outreach playbook is on the roadmap." },
    ],
    waitlistKey: "link-building-playbook",
    waitlistTitle: "Outreach playbook",
  },
  redditVisibility: {
    badge: "Reddit Visibility",
    status: "beta" as const,
    titleLine1: "Find threads.",
    titleLine2: "You post.",
    description:
      "Live Reddit search for high-intent discussions, then AI draft replies. Manual assist only — we never auto-post.",
    heroImage: HERO_IMAGES.roadmaps.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    features: [
      {
        icon: MessageSquare,
        title: "Real thread search",
        description: "Live posts from Reddit public search — not invented URLs.",
      },
      { icon: Target, title: "Intent scoring", description: "Prioritize threads where buyers ask for recommendations." },
      {
        icon: PenLine,
        title: "Draft replies",
        description: "Suggested responses to copy and edit. Never posted for you.",
      },
      { icon: Shield, title: "No auto-posting", description: "You own the relationship. We never astroturf." },
    ],
    faq: [
      {
        question: "Do you post to Reddit automatically?",
        answer:
          "No. Threads from public search; replies are drafts. You copy, edit, and post.",
      },
    ],
  },
  multilingual: {
    badge: "Multilingual",
    status: "beta" as const,
    titleLine1: "Multilingual drafts",
    titleLine2: "in beta",
    description:
      "Generate drafts in major European and Asian locales. Brand voice still applies. Localized keyword research and broader locale coverage are on the waitlist — we do not claim native-quality at scale yet.",
    heroImage: HERO_IMAGES.features.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    features: [
      { icon: Globe, title: "Major locales (beta)", description: "English, French, German, Spanish, Italian, Portuguese, Japanese, Korean, Chinese, and more in beta." },
      { icon: PenLine, title: "Brand voice preserved", description: "Tone and glossary apply across languages." },
      { icon: Search, title: "SEO/GEO structure", description: "Headings, FAQ, and schema-ready output in every locale we generate." },
      { icon: MapIcon, title: "Waitlist: research + 50+", description: "Localized keyword research and wider locale coverage next." },
    ],
    faq: [
      {
        question: "Which languages are supported?",
        answer:
          "Major European and Asian locales in beta. Quality varies by language; localized keyword research is waitlist, not live.",
      },
    ],
    waitlistKey: "multilingual-50",
    waitlistTitle: "Additional languages",
  },
  forAgencies: {
    badge: "For Agencies",
    status: "beta" as const,
    titleLine1: "Multi-client desk",
    titleLine2: "without rebuilding SEO",
    description:
      "Partner rollup across client projects, BYOK billing, and per-client Autopilot queues. Full white-label reseller is waitlist.",
    heroImage: HERO_IMAGES.pricing.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Studio", href: "/content-engine" },
    features: [
      { icon: Globe, title: "Multi-project", description: "Client sites in one workspace with rollup metrics." },
      { icon: Key, title: "BYOK", description: "Clients bring Gemini or Bedrock keys when plans allow." },
      { icon: BarChart3, title: "Competitor intel", description: "Real crawls per client when homepages are reachable." },
      { icon: Zap, title: "Autopilot per client", description: "Separate queues and CMS connections with review gates." },
    ],
    faq: [
      { question: "Is white-label available?", answer: "Full white-label reseller is on the roadmap. Owners and site admins already roll up client metrics on Clients." },
      { question: "How do I see all client projects?", answer: "Owners and site admins get Clients in the sidebar — visibility and publish status across projects." },
    ],
    waitlistKey: "agency-reseller",
    waitlistTitle: "Agency white-label program",
  },
  socialDistribution: {
    badge: "Social Hub",
    titleLine1: "Repurpose the article.",
    titleLine2: "Then schedule.",
    description:
      "Compose and queue for LinkedIn, X, Meta, Bluesky, and Mastodon from an approved Studio piece. OAuth per project — Chat does not live-post social.",
    heroImage: HERO_IMAGES.roadmaps.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Studio", href: "/content-engine" },
    features: [
      { icon: Share2, title: "Platform OAuth", description: "LinkedIn, X, Meta, Bluesky, Mastodon per project." },
      { icon: PenLine, title: "Composer + calendar", description: "Draft, schedule, recycle evergreen." },
      { icon: BarChart3, title: "Publish history", description: "Recent social and CMS publishes per project." },
      { icon: Zap, title: "From long-form", description: "Turn approved articles into social variants." },
    ],
    faq: [
      { question: "Is this included?", answer: "Yes with the platform. Connect on the Publishing tab. Hands-on programs optional if you want us running distribution." },
    ],
  },
  searchAnalytics: {
    badge: "Search Analytics",
    titleLine1: "GSC-grounded",
    titleLine2: "Action Queue",
    description:
      "Connect Search Console, Bing Webmaster, and GA4. Keywords, article performance, and an Action Queue for CTR gaps, slip, and decay — rank snapshots when DataForSEO is set.",
    heroImage: HERO_IMAGES.geoAudit.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Free GEO audit", href: "/geo-audit" },
    features: [
      { icon: BarChart3, title: "GSC + GA4", description: "Clicks and on-site engagement per published article." },
      { icon: Search, title: "Keyword hub", description: "Opportunities from GSC; ranks when DataForSEO is configured." },
      { icon: Target, title: "Action Queue", description: "CTR gaps, slip, decay — run, approve, or dismiss." },
      { icon: Eye, title: "AI visibility tie-in", description: "Join search performance with LLM citation trends." },
    ],
    faq: [
      { question: "Do I need separate tools?", answer: "No. Search analytics and Action Queue are in goals.ac via OAuth." },
    ],
  },
  brandVoice: {
    badge: "Brand Voice",
    titleLine1: "A voice guide",
    titleLine2: "the desk actually reads",
    description:
      "Scrape the site into an editable skill doc. At generation we pull a few topic-relevant passages into Chat and Studio — not a tone dropdown.",
    heroImage: HERO_IMAGES.contentEngine.hero,
    primaryCta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
    secondaryCta: { label: "Content Studio", href: "/content-engine" },
    features: [
      { icon: PenLine, title: "Editable skill doc", description: "Markdown guide you can rewrite — do's, don'ts, glossary." },
      { icon: BookOpen, title: "Topic retrieval", description: "A few passages matched to the keyword and format, not the whole corpus." },
      { icon: Globe, title: "Re-ingest when the site moves", description: "Sitemap, GSC top pages, or CMS site-graph when connected." },
      { icon: Shield, title: "Humanizer after draft", description: "Optional cadence pass before approve — still your call to publish." },
    ],
    faq: [
      {
        question: "How long does brand setup take?",
        answer: "Initial scrape usually finishes during onboarding in under 10 minutes. You can edit the skill after.",
      },
      {
        question: "Is this just a style prompt?",
        answer: "No. Scraped pages become a skill doc plus retrievable passages. Generation uses both.",
      },
    ],
  },
};
