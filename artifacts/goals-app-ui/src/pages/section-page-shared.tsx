import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export const strategyTabs = [
  { label: "Overview", to: "/strategy" },
  { label: "Goals", to: "/strategy/goals" },
  { label: "Calendar", to: "/strategy/calendar" },
  { label: "Roadmaps", to: "/strategy/roadmaps" },
  { label: "Topical map", to: "/strategy/topical-map" },
];

export const searchTabs = [
  { label: "Overview", to: "/search" },
  { label: "Keywords", to: "/search/keywords" },
  { label: "Visibility", to: "/search/visibility" },
  { label: "Performance", to: "/search/performance" },
  { label: "Site", to: "/search/site" },
  { label: "Suggestions", to: "/search/suggestions" },
];

export const researchTabs = [
  { label: "Overview", to: "/research" },
  { label: "Competitors", to: "/research/competitors" },
  { label: "Signals", to: "/research/reddit" },
];

export const renderLink = ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
  <Link to={href} className={className}>
    {children}
  </Link>
);

export function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 27);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}
