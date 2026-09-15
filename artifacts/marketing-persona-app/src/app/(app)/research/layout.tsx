import { RESEARCH_TABS } from "@workspace/app-shell/nav-config";
import { HubPageLayout } from "@/components/layout/hub-page-layout";

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubPageLayout title="Research" tabs={RESEARCH_TABS}>
      {children}
    </HubPageLayout>
  );
}
