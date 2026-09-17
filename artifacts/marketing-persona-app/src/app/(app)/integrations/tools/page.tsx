import { Suspense } from "react";
import { getSession } from "@/auth";
import { IntegrationsPageClient } from "../integrations-page-client";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { loadIntegrationsInitialData } from "@/lib/server/load-integrations-initial-data";

export default async function OrgIntegrationsToolsPage() {
  const session = await getSession();
  if (!session) return null;

  const initialData = await loadIntegrationsInitialData(parseInt(session.user.id, 10));

  return (
    <Suspense fallback={<PageSkeleton />}>
      <IntegrationsPageClient tab="tools" initialData={initialData} />
    </Suspense>
  );
}
