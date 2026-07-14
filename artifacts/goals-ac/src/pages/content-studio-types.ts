import {
  BookOpen, Newspaper, GraduationCap, Map as MapIcon, FileSearch, LayoutTemplate, Globe, ImageIcon,
  Linkedin, Twitter, Instagram, Mail, Megaphone, MonitorPlay, Package, Radio, HelpCircle,
} from "lucide-react";

export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type ContentFormatType =
  | "blog_post"
  | "news_article"
  | "tutorial"
  | "guide"
  | "whitepaper"
  | "pillar_page"
  | "location_page"
  | "infographic_outline"
  | "linkedin_post"
  | "twitter_thread"
  | "instagram_post"
  | "facebook_post"
  | "email_sequence"
  | "ad_copy"
  | "landing_page_copy"
  | "product_description"
  | "press_release"
  | "faq_article";

export type LinkedInArchetypeId =
  | "listicle"
  | "case-study"
  | "hot-take"
  | "personal-story"
  | "educational";
export type LinkedInHookId =
  | "bold-question"
  | "contrarian-take"
  | "surprising-stat"
  | "personal-confession"
  | "controversial";

export const LINKEDIN_ARCHETYPES: ReadonlyArray<{
  id: LinkedInArchetypeId;
  label: string;
  description: string;
}> = [
  { id: "listicle", label: "Listicle", description: "Numbered insights" },
  {
    id: "case-study",
    label: "Mini Case Study",
    description: "Client or success story",
  },
  { id: "hot-take", label: "Hot Take", description: "Contrarian viewpoint" },
  {
    id: "personal-story",
    label: "Personal Story",
    description: "Journey or confession",
  },
  { id: "educational", label: "Educational", description: "How-to insight" },
];

export const LINKEDIN_HOOK_TYPES: ReadonlyArray<{
  id: LinkedInHookId;
  label: string;
  template: string;
}> = [
  {
    id: "bold-question",
    label: "Bold Question",
    template: "What if [statement]?",
  },
  {
    id: "contrarian-take",
    label: "Contrarian Take",
    template: "Most [audience] get [topic] wrong.",
  },
  {
    id: "surprising-stat",
    label: "Surprising Stat",
    template: "83% of [audience] fail because of [reason].",
  },
  {
    id: "personal-confession",
    label: "Personal Confession",
    template: "I used to do X. Here's why I stopped.",
  },
  {
    id: "controversial",
    label: "Controversial",
    template: "Hot take: [statement]",
  },
];

export const FORMAT_META: Record<
  ContentFormatType,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
    example: string;
    wordRange: string;
  }
> = {
  blog_post: {
    label: "Blog Post",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description:
      "Engaging, shareable articles that build authority and drive organic traffic.",
    example: "e.g. '5 Ways SaaS Startups Can Win at Local SEO'",
    wordRange: "900–1,200 words",
  },
  news_article: {
    label: "News Article",
    icon: Newspaper,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    description:
      "Timely coverage of industry events, product launches, or market trends.",
    example:
      "e.g. 'AI Search Disrupts Traditional SEO — What Brands Need to Know'",
    wordRange: "600–900 words",
  },
  tutorial: {
    label: "Tutorial",
    icon: GraduationCap,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    description:
      "Step-by-step how-to content that solves a specific problem for your audience.",
    example: "e.g. 'How to Set Up Google Search Console in 10 Minutes'",
    wordRange: "1,200–1,600 words",
  },
  guide: {
    label: "Comprehensive Guide",
    icon: MapIcon,
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    description:
      "In-depth evergreen guides covering a topic end-to-end. Great for link building.",
    example: "e.g. 'The Complete Guide to Technical SEO for B2B SaaS'",
    wordRange: "1,400–1,800 words",
  },
  whitepaper: {
    label: "Whitepaper",
    icon: FileSearch,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    description:
      "Authoritative long-form research documents for lead gen and thought leadership.",
    example: "e.g. 'The State of GEO Optimisation for UK SMEs — 2025 Report'",
    wordRange: "1,800–2,500 words",
  },
  pillar_page: {
    label: "Pillar Page",
    icon: LayoutTemplate,
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    description:
      "Comprehensive hub pages that anchor your topic clusters and capture broad keywords.",
    example: "e.g. 'SEO for Startups: Everything You Need to Know'",
    wordRange: "2,000–3,000 words",
  },
  location_page: {
    label: "Location / Language Page",
    icon: Globe,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    description:
      "Location-specific or language-specific landing pages to capture local search intent.",
    example: "e.g. 'SEO Agency in Manchester — Goals.ac'",
    wordRange: "800–1,200 words",
  },
  infographic_outline: {
    label: "Infographic Outline",
    icon: ImageIcon,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    description:
      "A structured content brief for a visual infographic — ready for a designer.",
    example: "e.g. 'The Anatomy of a High-Converting SaaS Landing Page'",
    wordRange: "400–600 words",
  },
  linkedin_post: {
    label: "LinkedIn Post",
    icon: Linkedin,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description:
      "Founder-voice long-form posts that drive engagement and build authority.",
    example: "e.g. 'What I learned growing from 0 to 500 B2B customers'",
    wordRange: "1300–1800 characters",
  },
  twitter_thread: {
    label: "Twitter / X Thread",
    icon: Twitter,
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    description:
      "9-tweet threads that package a big insight into shareable, viral content.",
    example: "e.g. 'The 5 SEO levers every SaaS founder ignores (thread 🧵)'",
    wordRange: "300–500 words",
  },
  instagram_post: {
    label: "Instagram Post",
    icon: Instagram,
    color:
      "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
    description:
      "Hook-driven caption with hashtag block — optimised for saves and shares.",
    example: "e.g. 'The one thing we changed that 3x'd our inbound leads'",
    wordRange: "150–300 words",
  },
  facebook_post: {
    label: "Facebook Post",
    icon: Globe,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description: "Community-friendly posts for your Facebook Page.",
    example: "e.g. '3 lessons from our first year of growth'",
    wordRange: "150–400 words",
  },
  email_sequence: {
    label: "Email Sequence",
    icon: Mail,
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    description:
      "3-email nurture sequences with subject lines, preview text, and body copy.",
    example: "e.g. Welcome → Education → Offer sequence for a SaaS trial",
    wordRange: "800–1,200 words",
  },
  ad_copy: {
    label: "Ad Copy",
    icon: Megaphone,
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    description:
      "Google Search and Meta ad copy — headlines, descriptions, and A/B variants.",
    example: "e.g. Google Ads for 'B2B SEO software' with 3 headline variants",
    wordRange: "300–500 words",
  },
  landing_page_copy: {
    label: "Landing Page Copy",
    icon: MonitorPlay,
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    description:
      "Full landing page copy — hero, features, testimonials, FAQ, and CTA sections.",
    example: "e.g. Landing page for a growth roadmap SaaS product",
    wordRange: "600–900 words",
  },
  product_description: {
    label: "Product Description",
    icon: Package,
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    description:
      "Benefit-led product copy with features, use cases, and differentiators.",
    example: "e.g. Product page for an AI-powered SEO audit tool",
    wordRange: "300–500 words",
  },
  press_release: {
    label: "Press Release",
    icon: Radio,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    description:
      "Newsworthy press releases following AP style — ready to send to journalists.",
    example:
      "e.g. 'goals.ac Raises £2M Seed Round to Power B2B Growth Roadmaps'",
    wordRange: "500–700 words",
  },
  faq_article: {
    label: "FAQ / Knowledge Base",
    icon: HelpCircle,
    color:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    description:
      "8-12 Q&A articles that capture long-tail search intent and reduce support load.",
    example: "e.g. 'Everything you need to know about B2B content strategy'",
    wordRange: "800–1,200 words",
  },
};

export interface ContentPiece {
  id: number;
  websiteProjectId: number;
  formatType: ContentFormatType;
  title: string;
  targetKeyword: string;
  bodyMarkdown: string;
  status: string;
  wordCount: number;
  plannedDate: string | null;
  publishPlatform?: string | null;
  createdAt: string;
  source: "studio";
}

export interface LegacyItem {
  id: number;
  title: string;
  keyword: string;
  wordCount: number;
  status: string;
  createdAt: string;
  source: "seo_article" | "content_strategy" | "geo_audit" | "roadmap";
  linkTo: string;
  subtitle?: string;
}

export type HubItem = ContentPiece | LegacyItem;

export function isContentPiece(item: HubItem): item is ContentPiece {
  return item.source === "studio";
}

export const FORMAT_CATEGORIES: { label: string; formats: ContentFormatType[] }[] = [
  {
    label: "Long-form Articles",
    formats: [
      "blog_post",
      "news_article",
      "tutorial",
      "guide",
      "whitepaper",
      "pillar_page",
      "location_page",
      "infographic_outline",
    ],
  },
  {
    label: "Social Media",
    formats: ["linkedin_post", "twitter_thread", "instagram_post", "facebook_post"],
  },
  {
    label: "Email & Ads",
    formats: ["email_sequence", "ad_copy"],
  },
  {
    label: "Web Copy",
    formats: [
      "landing_page_copy",
      "product_description",
      "press_release",
      "faq_article",
    ],
  },
];

export const CALENDAR_WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function extractSections(jsonAccumulated: string): string[] {
  const bodyIdx = jsonAccumulated.indexOf('"body_markdown"');
  if (bodyIdx === -1) return [];
  const afterKey = jsonAccumulated.slice(bodyIdx + '"body_markdown"'.length);
  const valueMatch = afterKey.match(/:\s*"([\s\S]*)/);
  if (!valueMatch) return [];
  const rawValue = valueMatch[1];
    const lines = rawValue.split("\\n");
    return lines.flatMap((l) => {
      const trimmed = l.replace(/\\"/g, '"').trim();
      if (!/^#{1,3}\s/.test(trimmed)) return [];
      const heading = trimmed.replace(/^#+\s*/, "").trim();
      return heading ? [heading] : [];
    });
}
