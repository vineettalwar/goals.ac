import { SEARCH_TABS } from "@workspace/app-shell/nav-config";
import { HubPageLayout } from "@/components/layout/hub-page-layout";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubPageLayout title="Search" tabs={SEARCH_TABS}>
      {children}
    </HubPageLayout>
  );
}
