"use client";

import { HubPageLayout } from "@/components/layout/hub-page-layout";
import { STRATEGY_TABS } from "@/lib/projects/hub-tabs";

export default function StrategyLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubPageLayout
      title="Strategy"
      description="Plan growth roadmaps, content calendars, topical coverage, and goals"
      tabs={STRATEGY_TABS}
      basePath="/strategy"
    >
      {children}
    </HubPageLayout>
  );
}
