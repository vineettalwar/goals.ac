import { Suspense } from "react";
import { AdminIntegrationsPageClient } from "@/components/admin/integrations/admin-integrations-page-client";
import { IntegrationCategorySkeleton } from "@/components/integrations/integration-tile";
import { APP_SHELL_PAGE_WIDE } from "@workspace/app-shell/shell-constants";

function AdminIntegrationsPageFallback() {
  return (
    <div className={`${APP_SHELL_PAGE_WIDE} space-y-8`}>
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-15.5 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
        <div className="h-15.5 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
      </div>
      <div className="space-y-6">
        <IntegrationCategorySkeleton tileCount={1} compact />
      </div>
    </div>
  );
}

export default function AdminIntegrationsPage() {
  return (
    <Suspense fallback={<AdminIntegrationsPageFallback />}>
      <AdminIntegrationsPageClient />
    </Suspense>
  );
}
