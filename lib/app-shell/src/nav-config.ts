import {
  BarChart2,
  BookOpen,
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

export type NavItemDef = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefix?: string;
};

/**
 * Which slice of the product a user sees.
 *
 * `blog_wordpress` is the default: one product, blog articles published to
 * WordPress. `full` reveals the social, research, and GEO surfaces. Routes stay
 * mounted under either surface — this only decides what navigation offers, so
 * a direct link to a hidden page still works.
 */
export type ProductSurface = "blog_wordpress" | "full";

export const DEFAULT_PRODUCT_SURFACE: ProductSurface = "blog_wordpress";

/** Nav labels withheld from the blog surface. */
const NON_BLOG_NAV_LABELS = new Set(["Social Hub", "GEO Audit", "Research"]);

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
      { label: "Autopilot", href: "__autopilot__", icon: Zap },
    ],
  },
  {
    label: "Plan",
    items: [{ label: "Strategy", href: "/strategy", icon: Map, matchPrefix: "/strategy" }],
  },
  {
    label: "Measure",
    items: [
      { label: "Search", href: "/search", icon: BarChart2, matchPrefix: "/search" },
      { label: "GEO Audit", href: "/audit", icon: ScanSearch, matchPrefix: "/audit" },
    ],
  },
  {
    label: "Research",
    items: [{ label: "Research", href: "/research", icon: Users, matchPrefix: "/research" }],
  },
];

export const FOOTER_ITEMS: NavItemDef[] = [
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Help", href: "/help", icon: BookOpen },
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
    ...(partner ? [{ label: "Partner", href: "/partner", icon: Briefcase }] : []),
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
