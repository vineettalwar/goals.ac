import {
  BarChart2,
  FolderOpen,
  Globe,
  Layers,
  LayoutDashboard,
  Link2,
  Map,
  MessageSquare,
  Plug,
  ScanSearch,
  Search,
  Settings,
  Share2,
  Smile,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type MockNavChild = {
  id: string;
  label: string;
  badge?: string;
  icon: LucideIcon;
};

export type MockNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  children?: MockNavChild[];
};

export type MockNavSection = {
  label: string;
  items: MockNavItem[];
};

export type MockRailArea = {
  id: string;
  label: string;
  icon: LucideIcon;
  groups: Array<{ id: string; label: string; children: MockNavChild[] }>;
};

export const MOCK_PROJECTS = [
  { id: "acme", name: "Acme", subtitle: "Dashboard" },
  { id: "nike", name: "Nike", subtitle: "Dashboard" },
] as const;

export const SEARCH_CHILDREN: MockNavChild[] = [
  { id: "search-keywords", label: "Keywords", icon: Search },
  { id: "search-performance", label: "Performance", icon: BarChart2 },
  { id: "search-visibility", label: "AI Visibility", icon: ScanSearch },
  { id: "search-site", label: "Site Links", badge: "Beta", icon: Link2 },
];

export const STRATEGY_CHILDREN: MockNavChild[] = [
  { id: "strategy-roadmaps", label: "Roadmaps", icon: Map },
  { id: "strategy-calendar", label: "Calendar", icon: LayoutDashboard },
  { id: "strategy-topical", label: "Topical Map", icon: Globe },
  { id: "strategy-goals", label: "Goals", icon: Trophy },
];

export const RESEARCH_CHILDREN: MockNavChild[] = [
  { id: "research-overview", label: "Overview", icon: LayoutDashboard },
  { id: "research-competitors", label: "Competitors", icon: Users },
  { id: "research-signals", label: "Signals", icon: MessageSquare },
];

/** Screenshot-density extras — not in product hub tabs yet. */
export const GEO_PLACEHOLDER_CHILDREN: MockNavChild[] = [
  { id: "geo-ranking", label: "Ranking", icon: Trophy },
  { id: "geo-sentiment", label: "Sentiment", icon: Smile },
  { id: "geo-sources", label: "Source tracker", icon: FolderOpen },
  { id: "geo-domains", label: "Domain comparisons", icon: Globe },
];

export const NESTED_SECTIONS: MockNavSection[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "projects", label: "Projects", icon: FolderOpen },
    ],
  },
  {
    label: "Create",
    items: [
      { id: "studio", label: "Content Studio", icon: Layers },
      { id: "social", label: "Social Hub", icon: Share2 },
      { id: "autopilot", label: "Content Autopilot", icon: Zap },
    ],
  },
  {
    label: "Plan",
    items: [{ id: "strategy", label: "Strategy", icon: Map, children: STRATEGY_CHILDREN }],
  },
  {
    label: "Measure",
    items: [
      { id: "search", label: "Search", icon: BarChart2, children: SEARCH_CHILDREN },
      { id: "audit", label: "GEO Audit", icon: ScanSearch },
    ],
  },
  {
    label: "Research",
    items: [{ id: "research", label: "Research", icon: Users, children: RESEARCH_CHILDREN }],
  },
];

export const FOOTER_ITEMS: MockNavItem[] = [
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "settings", label: "Settings", icon: Settings },
];

export const RAIL_AREAS: MockRailArea[] = [
  {
    id: "dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    groups: [
      {
        id: "overview",
        label: "Workspace",
        children: [
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "projects", label: "Projects", icon: FolderOpen },
        ],
      },
    ],
  },
  {
    id: "create",
    label: "Create",
    icon: Layers,
    groups: [
      {
        id: "create",
        label: "Create",
        children: [
          { id: "studio", label: "Content Studio", icon: Layers },
          { id: "social", label: "Social Hub", icon: Share2 },
          { id: "autopilot", label: "Content Autopilot", icon: Zap },
        ],
      },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    icon: Map,
    groups: [{ id: "strategy", label: "Strategy", children: STRATEGY_CHILDREN }],
  },
  {
    id: "measure",
    label: "Measure",
    icon: BarChart2,
    groups: [
      { id: "search", label: "Overview", children: SEARCH_CHILDREN },
      { id: "geo", label: "Citations", children: GEO_PLACEHOLDER_CHILDREN },
    ],
  },
  {
    id: "research",
    label: "Research",
    icon: Users,
    groups: [{ id: "research", label: "Research", children: RESEARCH_CHILDREN }],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    groups: [
      {
        id: "settings",
        label: "Workspace",
        children: [
          { id: "integrations", label: "Integrations", icon: Plug },
          { id: "settings", label: "Settings", icon: Settings },
        ],
      },
    ],
  },
];

export const DEFAULT_ACTIVE_ID = "search-keywords";

export function itemOwnsActive(item: MockNavItem, activeId: string): boolean {
  if (item.id === activeId) return true;
  return item.children?.some((child) => child.id === activeId) ?? false;
}

export function labelForActive(activeId: string): string {
  for (const area of RAIL_AREAS) {
    for (const group of area.groups) {
      const child = group.children.find((c) => c.id === activeId);
      if (child) return child.label;
    }
  }
  for (const section of NESTED_SECTIONS) {
    for (const item of section.items) {
      if (item.id === activeId) return item.label;
      const child = item.children?.find((c) => c.id === activeId);
      if (child) return child.label;
    }
  }
  const footer = FOOTER_ITEMS.find((item) => item.id === activeId);
  return footer?.label ?? activeId;
}

export function railAreaForActive(activeId: string): MockRailArea {
  return (
    RAIL_AREAS.find((area) =>
      area.groups.some(
        (group) => group.id === activeId || group.children.some((c) => c.id === activeId),
      ),
    ) ?? RAIL_AREAS[0]!
  );
}

export function firstLeafId(area: MockRailArea): string {
  return area.groups[0]?.children[0]?.id ?? area.id;
}

{
  const search = NESTED_SECTIONS.flatMap((s) => s.items).find((i) => i.id === "search");
  if (!search?.children?.some((c) => c.id === DEFAULT_ACTIVE_ID)) {
    throw new Error("nav ia: default active missing from Search children");
  }
  if (!itemOwnsActive(search, DEFAULT_ACTIVE_ID)) {
    throw new Error("nav ia: Search should own keywords");
  }
  if (railAreaForActive(DEFAULT_ACTIVE_ID).id !== "measure") {
    throw new Error("nav ia: keywords belong on Measure rail");
  }
  if (labelForActive(DEFAULT_ACTIVE_ID) !== "Keywords") {
    throw new Error("nav ia: default label");
  }
}
