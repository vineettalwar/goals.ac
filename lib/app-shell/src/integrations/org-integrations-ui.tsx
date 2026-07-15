import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
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
  projectIntegrationsHref,
  footer,
}: {
  activeTab: OrgIntegrationsTab;
  onTabChange: (tab: OrgIntegrationsTab) => void;
  aiPanel: ReactNode;
  toolsPanel: ReactNode;
  /** Link to `/projects/:id/integrations` — CMS, social, ESP, search live there. */
  projectIntegrationsHref?: string | null;
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

      {projectIntegrationsHref !== undefined ? (
        <a
          href={projectIntegrationsHref ?? "/projects"}
          className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-left transition-all hover:border-border hover:bg-muted/20 hover:shadow-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
            CMS
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Project integrations</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {projectIntegrationsHref
                ? "CMS, social, email, and search connections for your active project"
                : "Choose a project to connect CMS, social, email, and search"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        </a>
      ) : null}

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
