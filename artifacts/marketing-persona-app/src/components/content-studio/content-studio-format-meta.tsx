import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Newspaper,
  GraduationCap,
  Map as MapIcon,
  FileSearch,
  LayoutTemplate,
  Globe,
  ImageIcon,
  Linkedin,
  Twitter,
  Instagram,
  Mail,
  Megaphone,
  MonitorPlay,
  Package,
  Radio,
  HelpCircle,
} from "lucide-react";

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

export const FORMAT_META: Record<
  ContentFormatType,
  {
    label: string;
    icon: LucideIcon;
    color: string;
    description: string;
    wordRange: string;
  }
> = {
  blog_post: {
    label: "Blog Post",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description: "Engaging articles that build authority and drive organic traffic.",
    wordRange: "900–1,200 words",
  },
  news_article: {
    label: "News Article",
    icon: Newspaper,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    description: "Timely coverage of industry events, launches, or market trends.",
    wordRange: "600–900 words",
  },
  tutorial: {
    label: "Tutorial",
    icon: GraduationCap,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    description: "Step-by-step how-to content that solves a specific problem.",
    wordRange: "1,200–1,600 words",
  },
  guide: {
    label: "Comprehensive Guide",
    icon: MapIcon,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    description: "In-depth evergreen guides covering a topic end-to-end.",
    wordRange: "1,400–1,800 words",
  },
  whitepaper: {
    label: "Whitepaper",
    icon: FileSearch,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    description: "Authoritative long-form research for lead gen and thought leadership.",
    wordRange: "1,800–2,500 words",
  },
  pillar_page: {
    label: "Pillar Page",
    icon: LayoutTemplate,
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    description: "Hub pages that anchor topic clusters and capture broad keywords.",
    wordRange: "2,000–3,000 words",
  },
  location_page: {
    label: "Location Page",
    icon: Globe,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    description: "Location-specific pages to capture local search intent.",
    wordRange: "800–1,200 words",
  },
  infographic_outline: {
    label: "Infographic Outline",
    icon: ImageIcon,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    description: "Structured brief for a visual infographic — ready for a designer.",
    wordRange: "400–600 words",
  },
  linkedin_post: {
    label: "LinkedIn Post",
    icon: Linkedin,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description: "Founder-voice posts that drive engagement and build authority.",
    wordRange: "1,300–1,800 characters",
  },
  twitter_thread: {
    label: "Twitter / X Thread",
    icon: Twitter,
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    description: "Threads that package a big insight into shareable content.",
    wordRange: "300–500 words",
  },
  instagram_post: {
    label: "Instagram Post",
    icon: Instagram,
    color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
    description: "Hook-driven captions optimised for saves and shares.",
    wordRange: "150–300 words",
  },
  facebook_post: {
    label: "Facebook Post",
    icon: Globe,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description: "Community-friendly posts for your Facebook Page.",
    wordRange: "150–400 words",
  },
  email_sequence: {
    label: "Email Sequence",
    icon: Mail,
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    description: "Nurture sequences with subject lines and body copy.",
    wordRange: "800–1,200 words",
  },
  ad_copy: {
    label: "Ad Copy",
    icon: Megaphone,
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    description: "Google Search and Meta ad copy with A/B variants.",
    wordRange: "300–500 words",
  },
  landing_page_copy: {
    label: "Landing Page Copy",
    icon: MonitorPlay,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    description: "Hero, features, testimonials, FAQ, and CTA sections.",
    wordRange: "600–900 words",
  },
  product_description: {
    label: "Product Description",
    icon: Package,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    description: "Benefit-led product copy with features and differentiators.",
    wordRange: "300–500 words",
  },
  press_release: {
    label: "Press Release",
    icon: Radio,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    description: "Newsworthy press releases following AP style.",
    wordRange: "500–700 words",
  },
  faq_article: {
    label: "FAQ Article",
    icon: HelpCircle,
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    description: "Structured Q&A content optimised for featured snippets and GEO.",
    wordRange: "800–1,200 words",
  },
};

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
    formats: ["landing_page_copy", "product_description", "press_release", "faq_article"],
  },
];

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
  { id: "case-study", label: "Mini Case Study", description: "Client or success story" },
  { id: "hot-take", label: "Hot Take", description: "Contrarian viewpoint" },
  { id: "personal-story", label: "Personal Story", description: "Journey or confession" },
  { id: "educational", label: "Educational", description: "How-to insight" },
];

export const LINKEDIN_HOOK_TYPES: ReadonlyArray<{
  id: LinkedInHookId;
  label: string;
  template: string;
}> = [
  { id: "bold-question", label: "Bold Question", template: "What if [statement]?" },
  { id: "contrarian-take", label: "Contrarian Take", template: "Most [audience] get [topic] wrong." },
  { id: "surprising-stat", label: "Surprising Stat", template: "83% of [audience] fail because of [reason]." },
  { id: "personal-confession", label: "Personal Confession", template: "I used to do X. Here's why I stopped." },
  { id: "controversial", label: "Controversial", template: "Hot take: [statement]" },
];

const STATUS_DOT_COLORS: Record<string, string> = {
  draft: "bg-amber-500",
  ready: "bg-emerald-500",
  published: "bg-blue-500",
  prepared: "bg-violet-500",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  published: "Published",
  prepared: "Prepared",
};

export function FormatBadge({ type }: { type: string }) {
  const meta = FORMAT_META[type as ContentFormatType];
  if (!meta) return <span className="text-xs text-muted-foreground">{type}</span>;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const dot = STATUS_DOT_COLORS[status] ?? "bg-muted-foreground";
  const label =
    STATUS_LABELS[status] ??
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
