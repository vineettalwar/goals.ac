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
}) {
  const { userRole, orgRole } = options;
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
  ];

  const footerItems: NavItemDef[] = admin
    ? [...FOOTER_ITEMS, { label: "Admin", href: "/admin", icon: Shield }]
    : FOOTER_ITEMS;

  return { navSections, footerItems };
}
