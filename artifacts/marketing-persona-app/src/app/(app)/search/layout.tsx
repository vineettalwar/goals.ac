import { SEARCH_TABS } from "@workspace/app-shell/nav-config";
import { HubPageLayout } from "@/components/layout/hub-page-layout";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubPageLayout
      title="Search"
      description="Keyword ideas, ranks, and citation tracking."
      tabs={SEARCH_TABS}
    >
      {children}
    </HubPageLayout>
  );
}
