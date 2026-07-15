import type { ReactNode } from "react";
import { cn } from "../cn";
import type { OrgIntegrationsTab } from "./types";

const TABS: Array<{ id: OrgIntegrationsTab; label: string }> = [
  { id: "ai", label: "AI" },
  { id: "tools", label: "Tools" },
];

export function OrgIntegrationsView({
  activeTab,
  onTabChange,
  aiPanel,
  toolsPanel,
  footer,
}: {
  activeTab: OrgIntegrationsTab;
  onTabChange: (tab: OrgIntegrationsTab) => void;
  aiPanel: ReactNode;
  toolsPanel: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Org integrations</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide credentials for AI providers, keyword research, translation, and stock
          photos. Shared across all projects. Credentials are encrypted at rest.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "ai" ? aiPanel : null}
      {activeTab === "tools" ? toolsPanel : null}

      {footer}
    </div>
  );
}
