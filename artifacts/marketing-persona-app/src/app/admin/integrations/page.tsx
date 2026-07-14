import { Suspense } from "react";
import { AdminIntegrationsPageClient } from "@/components/admin/admin-integrations-page-client";
import { IntegrationCategorySkeleton } from "@/components/integration-tile";

function AdminIntegrationsPageFallback() {
  return (
    <div className="px-8 py-8 max-w-5xl space-y-6">
      <div className="space-y-1">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted/70" />
      </div>
      <div className="space-y-6">
        <IntegrationCategorySkeleton tileCount={1} />
        <IntegrationCategorySkeleton tileCount={1} />
        <IntegrationCategorySkeleton tileCount={2} />
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
