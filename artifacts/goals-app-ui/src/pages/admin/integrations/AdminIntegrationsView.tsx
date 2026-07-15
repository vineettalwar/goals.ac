import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { IntegrationTabBadge } from "@workspace/app-shell";
import { PLATFORM_INTEGRATION_CATEGORIES, type PlatformIntegrationCategoryId } from "./types";
import { useAdminIntegrationsController } from "./use-controller";
import { AdminIntegrationsContent } from "./panel";
import { AdminIntegrationsDialogs } from "./dialogs";

const TAB_SKELETONS: Record<PlatformIntegrationCategoryId, number> = {
  billing: 1,
  email: 1,
  media: 2,
  social: 1,
  ai: 1,
};

const DEFAULT_TAB = PLATFORM_INTEGRATION_CATEGORIES[0]?.id ?? "billing";

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-border bg-muted/30"
        />
      ))}
    </div>
  );
}

export function AdminIntegrationsView() {
  const controller = useAdminIntegrationsController();
  const [activeTab, setActiveTab] = useState<PlatformIntegrationCategoryId>(DEFAULT_TAB);
  const { loading, loadError, reload, counts, notice, clearNotice } = controller;

  return (
    <div className="max-w-5xl space-y-6 px-8 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Platform integrations</h1>
        <p className="text-sm text-muted-foreground">
          Manage platform-wide{" "}
          <span className="font-medium text-foreground">
            billing, email, stock images, social OAuth, and AI providers
          </span>
          . Credentials are encrypted at rest.
        </p>
      </div>

      {notice ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          <span>{notice.message}</span>
          <button type="button" className="text-xs underline" onClick={clearNotice}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          to="/integrations/ai"
          className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-all hover:border-border hover:bg-muted/20 hover:shadow-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#4285F4] text-xs font-bold text-white">
            AI
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Org integrations</p>
            <p className="truncate text-xs text-muted-foreground">BYOK AI keys &amp; tools</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
        </Link>
        <Link
          to="/projects"
          className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-all hover:border-border hover:bg-muted/20 hover:shadow-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
            CMS
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Project integrations</p>
            <p className="truncate text-xs text-muted-foreground">
              Open a project → Integrations for CMS, social, email, search
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">Could not load platform integrations</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check server logs — pending database migrations are a common cause.
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {PLATFORM_INTEGRATION_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveTab(category.id)}
                className={`inline-flex items-center gap-0.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === category.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {category.label}
                <IntegrationTabBadge count={counts[category.id]} loading={loading} />
              </button>
            ))}
          </div>

          {/* Tab content */}
          {loading ? (
            <div className="space-y-6">
              <div className="border-b border-border/50 pb-4">
                <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted/70" />
              </div>
              <LoadingSkeleton count={TAB_SKELETONS[activeTab]} />
            </div>
          ) : (
            <AdminIntegrationsContent controller={controller} activeTab={activeTab} />
          )}
        </div>
      )}

      <p className={`text-sm text-muted-foreground ${loading ? "invisible" : ""}`}>
        Need setup instructions?{" "}
        <Link to="/help" className="text-primary hover:underline">
          Help center
        </Link>
        .
      </p>

      <AdminIntegrationsDialogs controller={controller} />
    </div>
  );
}
