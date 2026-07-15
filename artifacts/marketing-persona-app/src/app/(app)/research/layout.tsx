"use client";

import { HubPageLayout } from "@/components/layout/hub-page-layout";
import { RESEARCH_TABS } from "@/lib/projects/hub-tabs";

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubPageLayout
      title="Research"
      description="Competitive landscape and demand signals for this project"
      tabs={RESEARCH_TABS}
      basePath="/research"
    >
      {children}
    </HubPageLayout>
  );
}
