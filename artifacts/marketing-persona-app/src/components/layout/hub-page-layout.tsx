import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";
import { HubTabNav } from "@/components/layout/hub-tab-nav";
import type { SectionTab } from "@workspace/app-shell/section";

interface HubPageLayoutProps {
  title: string;
  tabs?: readonly SectionTab[];
  children: React.ReactNode;
}

export function HubPageLayout({ title, tabs, children }: HubPageLayoutProps) {
  return (
    <div className={APP_SHELL_PAGE}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {tabs && tabs.length > 0 ? <HubTabNav tabs={tabs} /> : null}
      {children}
    </div>
  );
}
