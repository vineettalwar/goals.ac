"use client";

import { HubPageLayout } from "@/components/hub-page-layout";
import { SEARCH_TABS } from "@/lib/hub-tabs";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubPageLayout
      title="Search"
      description="Track keyword ranks, LLM citations, and internal link coverage"
      tabs={SEARCH_TABS}
      basePath="/search"
    >
      {children}
    </HubPageLayout>
  );
}
