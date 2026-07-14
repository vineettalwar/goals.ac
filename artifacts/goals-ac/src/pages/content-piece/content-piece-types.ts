import type { ContentFormatType } from "@/lib/publishing-destinations";
import {
  BookOpen, Newspaper, GraduationCap, Map, FileSearch, LayoutTemplate, Globe, ImageIcon,
  Linkedin, Twitter, Instagram, Mail, Megaphone, MonitorPlay, Package, Radio, HelpCircle,
} from "lucide-react";

export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const FORMAT_META: Record<ContentFormatType, { label: string; icon: React.ElementType; color: string }> = {
  blog_post: { label: "Blog Post", icon: BookOpen, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  news_article: { label: "News Article", icon: Newspaper, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  tutorial: { label: "Tutorial", icon: GraduationCap, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  guide: { label: "Comprehensive Guide", icon: Map, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  whitepaper: { label: "Whitepaper", icon: FileSearch, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  pillar_page: { label: "Pillar Page", icon: LayoutTemplate, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  location_page: { label: "Location Page", icon: Globe, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  infographic_outline: { label: "Infographic Outline", icon: ImageIcon, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  linkedin_post: { label: "LinkedIn Post", icon: Linkedin, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  twitter_thread: { label: "Twitter / X Thread", icon: Twitter, color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  instagram_post: { label: "Instagram Post", icon: Instagram, color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400" },
  facebook_post: { label: "Facebook Post", icon: Globe, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  email_sequence: { label: "Email Sequence", icon: Mail, color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  ad_copy: { label: "Ad Copy", icon: Megaphone, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  landing_page_copy: { label: "Landing Page Copy", icon: MonitorPlay, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  product_description: { label: "Product Description", icon: Package, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  press_release: { label: "Press Release", icon: Radio, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  faq_article: { label: "FAQ / Knowledge Base", icon: HelpCircle, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
};

export const ALL_FORMATS = Object.keys(FORMAT_META) as ContentFormatType[];

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
  publishedUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
