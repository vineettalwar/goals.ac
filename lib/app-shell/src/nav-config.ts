import {
  BarChart2,
  Briefcase,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Map,
  Plug,
  ScanSearch,
  Settings,
  Share2,
  Shield,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { isSuperAdmin, showPartnerNav } from "./nav-roles";

export type NavChildDef = {
  label: string;
  href: string;
  badge?: string;
  exact?: boolean;
};

export type NavItemDef = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefix?: string;
  children?: NavChildDef[];
};

/**
 * Which slice of the product a user sees.
 *
 * `full` is the default: marketing sells GEO, research, and social, so those
 * nav items stay visible. `blog_wordpress` is an optional narrower surface.
 */
export type ProductSurface = "blog_wordpress" | "full";

export const DEFAULT_PRODUCT_SURFACE: ProductSurface = "full";

/** Nav labels withheld from the blog surface. */
const NON_BLOG_NAV_LABELS = new Set(["Social Hub", "GEO Audit", "Research"]);

export const STRATEGY_TABS = [
  { label: "Roadmaps", to: "/strategy/roadmaps" },
  { label: "Calendar", to: "/strategy/calendar" },
  { label: "Topical map", to: "/strategy/topical-map" },
  { label: "Goals", to: "/strategy/goals" },
] as const;

export const SEARCH_TABS = [
  { label: "Keywords", to: "/search/keywords" },
  { label: "Actions", to: "/search/actions" },
  { label: "Performance", to: "/search/performance" },
  { label: "AI visibility", to: "/search/visibility" },
  { label: "Site links", to: "/search/site" },
] as const;

export const RESEARCH_TABS = [
  { label: "Overview", to: "/research", exact: true as const },
  { label: "Competitors", to: "/research/competitors" },
  { label: "Signals", to: "/research/reddit" },
] as const;

export const NAV_SECTIONS: Array<{ label: string; items: NavItemDef[] }> = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Projects", href: "/projects", icon: FolderOpen },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Content Studio", href: "__content_studio__", icon: Layers },
      { label: "Social Hub", href: "__social_hub__", icon: Share2 },
      { label: "Content Autopilot", href: "__autopilot__", icon: Zap },
    ],
  },
  {
    label: "Plan",
    items: [
      {
        label: "Strategy",
        href: "/strategy/roadmaps",
        icon: Map,
        matchPrefix: "/strategy",
      },
    ],
  },
  {
    label: "Measure",
    items: [
      {
        label: "Search",
        href: "/search/keywords",
        icon: BarChart2,
        matchPrefix: "/search",
      },
      { label: "GEO Audit", href: "/audit", icon: ScanSearch, matchPrefix: "/audit" },
    ],
  },
  {
    label: "Research",
    items: [
      {
        label: "Research",
        href: "/research",
        icon: Users,
        matchPrefix: "/research",
      },
    ],
  },
];

export const FOOTER_ITEMS: NavItemDef[] = [
  { label: "Integrations", href: "__integrations__", icon: Plug },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function buildNavModel(options: {
  userRole?: string | null;
  orgRole?: string | null;
  surface?: ProductSurface | null;
}) {
  const { userRole, orgRole } = options;
  const surface = options.surface ?? DEFAULT_PRODUCT_SURFACE;
  const partner = showPartnerNav(userRole, orgRole);
  const admin = isSuperAdmin(userRole);

  const overviewItems: NavItemDef[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/projects", icon: FolderOpen },
    ...(partner ? [{ label: "Clients", href: "/clients", icon: Briefcase }] : []),
  ];

  const navSections: Array<{ label: string; items: NavItemDef[] }> = [
    { label: "Overview", items: overviewItems },
    ...NAV_SECTIONS.slice(1),
  ]
    .map((section) => ({
      ...section,
      items:
        surface === "full"
          ? section.items
          : section.items.filter((item) => !NON_BLOG_NAV_LABELS.has(item.label)),
    }))
    .filter((section) => section.items.length > 0);

  const footerItems: NavItemDef[] = admin
    ? [...FOOTER_ITEMS, { label: "Admin", href: "/admin", icon: Shield }]
    : FOOTER_ITEMS;

  return { navSections, footerItems };
}
