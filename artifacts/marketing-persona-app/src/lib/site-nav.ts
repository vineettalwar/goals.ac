import { LANDER_CONFIG } from "@/lib/marketing-feature-data";

export type LanderConfigKey = keyof typeof LANDER_CONFIG;

export type NavLink = {
  label: string;
  href: string;
  description?: string;
};

export type SolutionGroup = "ai-search" | "content" | "authority" | "teams";

export const SOLUTION_GROUP_LABELS: Record<SolutionGroup, string> = {
  "ai-search": "Rank in AI search",
  content: "Content & strategy",
  authority: "Authority & distribution",
  teams: "By team",
};

export const LANDER_ROUTES: Record<LanderConfigKey, string> = {
  aiVisibility: "/llm-visibility",
  rankOnChatgpt: "/rank-on-chatgpt",
  geo: "/generative-engine-optimization",
  contentStrategy: "/content-strategy",
  autopilot: "/content-autopilot",
  cmsPublishing: "/cms-publishing",
  linkBuilding: "/link-building",
  redditVisibility: "/reddit-visibility",
  multilingual: "/multilingual-content",
  forAgencies: "/for-agencies",
};

export const PRODUCT_NAV: NavLink[] = [
  { label: "Content Engine", href: "/content-engine", description: "Draft and review workflow" },
  { label: "Content Autopilot", href: "/content-autopilot", description: "Automated publishing queue" },
  { label: "AI Visibility", href: "/llm-visibility", description: "Track AI brand citations" },
  { label: "CMS Publishing", href: "/cms-publishing", description: "WordPress, Shopify, and more" },
  { label: "All features", href: "/features", description: "Full platform overview" },
];

export type SolutionNavItem = NavLink & {
  group: SolutionGroup;
  landerKey?: LanderConfigKey;
};

function landerSolution(key: LanderConfigKey, group: SolutionGroup): SolutionNavItem {
  const config = LANDER_CONFIG[key];
  return {
    label: config.badge,
    href: LANDER_ROUTES[key],
    description: config.description,
    group,
    landerKey: key,
  };
}

export const SOLUTIONS_NAV: SolutionNavItem[] = [
  landerSolution("rankOnChatgpt", "ai-search"),
  landerSolution("geo", "ai-search"),
  { label: "GEO Audit", href: "/geo-audit", description: "Free technical scan for AI visibility", group: "ai-search" },
  landerSolution("contentStrategy", "content"),
  { label: "Growth Roadmaps", href: "/roadmaps", description: "Free 12-month strategic roadmaps", group: "content" },
  landerSolution("multilingual", "content"),
  landerSolution("linkBuilding", "authority"),
  landerSolution("redditVisibility", "authority"),
  landerSolution("forAgencies", "teams"),
];

export const RESOURCES_NAV: NavLink[] = [
  { label: "Help", href: "/help", description: "Setup & publishing guides" },
  { label: "Learn", href: "/learn", description: "SEO & GEO academy" },
  { label: "Success Stories", href: "/success-stories", description: "Customer results" },
  { label: "Growth Roadmaps", href: "/roadmaps", description: "Browse public roadmaps" },
  { label: "Compare AI SEO tools", href: "/compare/ai-seo-tools", description: "goals.ac vs autopilot tools" },
  { label: "Product roadmap", href: "/product-roadmap", description: "What we're building next" },
];

export const FREE_TOOLS_NAV: NavLink[] = [
  { label: "GEO Audit", href: "/geo-audit" },
  { label: "Meta checker", href: "/free-tools#meta-checker" },
  { label: "llms.txt Generator", href: "/free-tools#llms-txt" },
  { label: "Robots.txt Checker", href: "/free-tools#robots" },
  { label: "Sitemap Checker", href: "/free-tools#sitemap" },
  { label: "SERP preview", href: "/free-tools#serp-preview" },
  { label: "All free tools", href: "/free-tools" },
];

export type FooterColumn = {
  title: string;
  links: NavLink[];
};

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Content Engine", href: "/content-engine" },
      { label: "Autopilot", href: "/content-autopilot" },
      { label: "AI Visibility", href: "/llm-visibility" },
      { label: "CMS Publishing", href: "/cms-publishing" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Rank on ChatGPT", href: "/rank-on-chatgpt" },
      { label: "Generative Engine Optimization", href: "/generative-engine-optimization" },
      { label: "Content Strategy", href: "/content-strategy" },
      { label: "For Agencies", href: "/for-agencies" },
      { label: "All solutions", href: "/solutions" },
    ],
  },
  {
    title: "Free Tools",
    links: FREE_TOOLS_NAV,
  },
  {
    title: "Resources",
    links: [
      { label: "Help", href: "/help" },
      { label: "Learn", href: "/learn" },
      { label: "Success Stories", href: "/success-stories" },
      { label: "Roadmaps", href: "/roadmaps" },
      { label: "Compare tools", href: "/compare/ai-seo-tools" },
      { label: "Product roadmap", href: "/product-roadmap" },
      { label: "For agencies", href: "/for-agencies" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function solutionsByGroup(): Record<SolutionGroup, SolutionNavItem[]> {
  const grouped = {} as Record<SolutionGroup, SolutionNavItem[]>;
  for (const item of SOLUTIONS_NAV) {
    grouped[item.group] ??= [];
    grouped[item.group].push(item);
  }
  return grouped;
}

export function isNavActive(pathname: string, href: string) {
  const base = href.split("#")[0];
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}
