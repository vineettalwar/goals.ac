export type HubTab = {
  label: string;
  href: string;
  badge?: string;
};

export const STRATEGY_TABS: HubTab[] = [
  { label: "Roadmaps", href: "/strategy/roadmaps" },
  { label: "Calendar", href: "/strategy/calendar" },
  { label: "Topical Map", href: "/strategy/topical-map" },
  { label: "Goals", href: "/strategy/goals" },
];

export const SEARCH_TABS: HubTab[] = [
  { label: "Keywords", href: "/search/keywords" },
  { label: "Performance", href: "/search/performance" },
  { label: "AI Visibility", href: "/search/visibility" },
  { label: "Site Links", href: "/search/site", badge: "Beta" },
];

export const RESEARCH_TABS: HubTab[] = [
  { label: "Overview", href: "/research" },
  { label: "Competitors", href: "/research/competitors" },
  { label: "Signals", href: "/research/reddit" },
];
