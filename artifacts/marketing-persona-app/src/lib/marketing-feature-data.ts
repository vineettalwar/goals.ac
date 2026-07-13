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
  Target,
  Zap,
} from "lucide-react";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

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
    desc: "Calendar from your growth roadmap and topical map, not generic topic lists.",
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
    icon: Globe,
    title: "Multilingual content",
    desc: "10 languages today with native-quality output. 50+ locales on our roadmap.",
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
    featureTitles: ["Automated publishing", "Internal link hub", "Multilingual content"],
  },
  {
    title: "Measure",
    featureTitles: ["Technical GEO audit", "LLM visibility tracking", "Reddit discovery"],
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
    primaryCta: { label: "Start free", href: "/signup" },
    secondaryCta: { label: "Run GEO audit", href: "/geo-audit" },
    features: [
      { icon: Eye, title: "Multi-engine tracking", description: "Snapshots for ChatGPT, Perplexity, Claude, and Gemini." },
      { icon: BarChart3, title: "Citation trends", description: "Weekly visibility score and competitor mention charts." },
      { icon: BookOpen, title: "Prompt library", description: "Track brand-relevant prompts your buyers actually ask." },
      { icon: Shield, title: "GEO re-audit", description: "Re-run technical audits when visibility drops." },
    ],
    faq: [
      { question: "Which AI engines do you track?", answer: "ChatGPT, Perplexity, Claude, and Gemini with periodic snapshot checks." },
      { question: "Do I need a paid plan?", answer: "AI visibility is included on Growth and Scale plans." },
    ],
  },
  rankOnChatgpt: {
    badge: "Rank on ChatGPT",
    titleLine1: "Get recommended",
    titleLine2: "by AI assistants",
    description: "Structure content for citation: schema, FAQ, authoritative sources, and topical depth, not keyword stuffing.",
    heroImage: HERO_IMAGES.features.capabilities,
    primaryCta: { label: "Build your roadmap", href: "/roadmaps" },
    secondaryCta: { label: "Free GEO audit", href: "/geo-audit" },
    features: [
      { icon: Search, title: "GEO-ready drafts", description: "JSON-LD, FAQ blocks, and citation-friendly structure." },
      { icon: Network, title: "Topical authority", description: "Cluster coverage map shows gaps AI systems expect you to own." },
      { icon: Eye, title: "Visibility monitoring", description: "Know when assistants start citing your pages." },
      { icon: FileText, title: "Brand-aligned content", description: "Articles inherit your voice and cross-link your offerings." },
    ],
    faq: [
      { question: "How long until AI citations?", answer: "Most teams see movement in 4–12 weeks as content publishes and indexes." },
      { question: "Is this different from SEO?", answer: "GEO optimizes for AI retrieval and citation. We align both in one workflow." },
    ],
  },
  geo: {
    badge: "Generative Engine Optimization",
    titleLine1: "Optimize for",
    titleLine2: "AI search engines",
    description: "GEO audits find schema gaps, weak metadata, and structure issues that hurt ChatGPT, Perplexity, and Google AI visibility.",
    heroImage: HERO_IMAGES.features.cta,
    primaryCta: { label: "Run free audit", href: "/geo-audit" },
    secondaryCta: { label: "See pricing", href: "/pricing" },
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
    titleLine2: "from your roadmap",
    description: "Turn your 12-month growth roadmap into a prioritized 30-day content calendar with formats, owners, and rationale.",
    heroImage: HERO_IMAGES.home.workflow,
    primaryCta: { label: "Start free", href: "/signup" },
    secondaryCta: { label: "Browse roadmaps", href: "/roadmaps" },
    features: [
      { icon: MapIcon, title: "Roadmap-driven", description: "Every item ties back to a strategic phase, not random topics." },
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
    titleLine1: "Publish on schedule",
    titleLine2: "with editorial control",
    description: "Daily or weekly generation with manual review, draft, or live publish. You choose the level of automation.",
    heroImage: HERO_IMAGES.features.hero,
    primaryCta: { label: "Start free", href: "/signup" },
    features: [
      { icon: Zap, title: "Flexible cadence", description: "Daily or weekly runs in your timezone." },
      { icon: Shield, title: "Review queue", description: "Inspect every draft before it goes live." },
      { icon: Globe, title: "CMS publish", description: "WordPress, Shopify, Notion, Ghost, and more." },
      { icon: ClipboardCheck, title: "Quality scores", description: "Per-article scores for structure, citations, and schema." },
    ],
    faq: [
      { question: "Can I review before publishing?", answer: "Yes. Set publish mode to manual or draft. Live auto-publish is optional." },
    ],
  },
  cmsPublishing: {
    badge: "CMS Publishing",
    titleLine1: "Publish where",
    titleLine2: "you already work",
    description: "Native integrations and plugins for WordPress, Shopify, Drupal, Joomla, Notion, Webflow, Ghost, and webhooks.",
    heroImage: HERO_IMAGES.contentEngine.hero,
    primaryCta: { label: "Start free", href: "/signup" },
    secondaryCta: { label: "Content Engine", href: "/content-engine" },
    features: [
      { icon: Globe, title: "8+ platforms", description: "More CMS coverage than typical AI SEO tools." },
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
    description: "Build topical authority with internal link clusters and content depth, not paid exchange networks that risk penalties.",
    heroImage: HERO_IMAGES.features.capabilities,
    primaryCta: { label: "Try Internal Link Hub", href: "/signup" },
    secondaryCta: { label: "Compare tools", href: "/compare/ai-seo-tools" },
    features: [
      { icon: Network, title: "Internal link graph", description: "See orphan pages and missing inbound links." },
      { icon: Link2, title: "Contextual suggestions", description: "Anchor text recommendations per draft." },
      { icon: MapIcon, title: "Cluster completion", description: "Track pillar + supporting article coverage." },
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
    description: "Discover high-intent Reddit discussions in your niche and get draft reply suggestions. You post manually.",
    heroImage: HERO_IMAGES.home.signup,
    primaryCta: { label: "Try Reddit Discovery", href: "/signup" },
    features: [
      { icon: MessageSquare, title: "Thread discovery", description: "AI finds relevant subreddit posts for your keywords." },
      { icon: Target, title: "Intent scoring", description: "Prioritize threads where buyers ask for recommendations." },
      { icon: PenLine, title: "Draft replies", description: "Suggested responses aligned with your brand voice." },
      { icon: Shield, title: "No auto-posting", description: "You own the relationship. We never astroturf." },
    ],
    faq: [
      { question: "Do you post to Reddit automatically?", answer: "No. We suggest threads and drafts. You copy, edit, and post yourself." },
    ],
  },
  multilingual: {
    badge: "Multilingual",
    status: "beta" as const,
    titleLine1: "10 languages",
    titleLine2: "today · 50+ soon",
    description: "Generate native-quality B2B content in 10 languages. Join the waitlist for additional locales.",
    heroImage: HERO_IMAGES.features.hero,
    primaryCta: { label: "Start free", href: "/signup" },
    features: [
      { icon: Globe, title: "10 languages live", description: "English, French, German, Spanish, Italian, Portuguese, Dutch, Swedish, Polish, UK English." },
      { icon: PenLine, title: "Brand voice preserved", description: "Tone and glossary apply across languages." },
      { icon: Search, title: "SEO/GEO aligned", description: "Structured output in every locale." },
      { icon: MapIcon, title: "Roadmap locales", description: "50+ languages planned. Vote with the waitlist." },
    ],
    faq: [
      { question: "Which languages are supported?", answer: "10 today; join the waitlist to prioritize the next locales we add." },
    ],
    waitlistKey: "multilingual-50",
    waitlistTitle: "Additional languages",
  },
  forAgencies: {
    badge: "For Agencies",
    status: "coming-soon" as const,
    titleLine1: "Resell SEO",
    titleLine2: "without building it",
    description: "Manage multiple client projects, BYOK billing, and white-label roadmaps. Reseller dashboard coming soon.",
    heroImage: HERO_IMAGES.pricing.hero,
    primaryCta: { label: "Start on Scale", href: "/signup?plan=scale" },
    secondaryCta: { label: "See pricing", href: "/pricing" },
    features: [
      { icon: Globe, title: "Multi-project", description: "Unlimited projects on Scale plan today." },
      { icon: Key, title: "BYOK", description: "Clients bring their own AI keys for cost control." },
      { icon: BarChart3, title: "Competitor intel", description: "Unlimited competitor analysis on Scale." },
      { icon: Zap, title: "Autopilot per client", description: "Separate queues and CMS connections." },
    ],
    faq: [
      { question: "Is white-label available?", answer: "Not yet. Join the agency waitlist for early access to reseller features." },
    ],
    waitlistKey: "agency-reseller",
    waitlistTitle: "Agency reseller program",
  },
};
