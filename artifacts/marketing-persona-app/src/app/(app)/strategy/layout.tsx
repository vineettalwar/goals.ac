import { STRATEGY_TABS } from "@workspace/app-shell/nav-config";
import { HubPageLayout } from "@/components/layout/hub-page-layout";

export default function StrategyLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubPageLayout title="Strategy" tabs={STRATEGY_TABS}>
      {children}
    </HubPageLayout>
  );
}
