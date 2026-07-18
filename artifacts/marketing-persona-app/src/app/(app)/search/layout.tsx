"use client";

import { HubPageLayout } from "@/components/layout/hub-page-layout";
import { SEARCH_TABS } from "@/lib/projects/hub-tabs";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubPageLayout
      title="Search"
      description="Ranks, performance, AI citations, and site links"
      tabs={SEARCH_TABS}
      basePath="/search"
    >
      {children}
    </HubPageLayout>
  );
}
