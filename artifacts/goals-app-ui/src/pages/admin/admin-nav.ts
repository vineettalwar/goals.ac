import {
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Plug,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavChild = {
  label: string;
  href: string;
  exact?: boolean;
};

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  children?: AdminNavChild[];
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    children: [
      { label: "Directory", href: "/admin/users", exact: true },
      { label: "Invite", href: "/admin/users/invite" },
    ],
  },
  {
    label: "Organizations",
    href: "/admin/organizations",
    icon: Building2,
    children: [
      { label: "All organizations", href: "/admin/organizations", exact: true },
      { label: "Onboard", href: "/admin/organizations/onboard" },
    ],
  },
  { label: "Plans", href: "/admin/plans", icon: CreditCard },
  { label: "Integrations", href: "/admin/integrations", icon: Plug },
  { label: "Content pipeline", href: "/admin/content-strategies", icon: FileText },
  { label: "Platform", href: "/admin/platform", icon: Settings2 },
];

export function isAdminNavActive(
  pathname: string,
  item: { href: string; exact?: boolean },
): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** @deprecated Use ADMIN_NAV_ITEMS instead */
export const ADMIN_TABS = [
  { label: "Overview", to: "/admin" },
  { label: "Users", to: "/admin/users" },
  { label: "Organizations", to: "/admin/organizations" },
] as const;
