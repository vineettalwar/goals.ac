import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { RESEARCH_TABS, SEARCH_TABS, STRATEGY_TABS } from "@workspace/app-shell";

export const strategyTabs = [...STRATEGY_TABS];
export const searchTabs = [...SEARCH_TABS];
export const researchTabs = [...RESEARCH_TABS];

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
