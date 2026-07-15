import { Suspense } from "react";
import { IntegrationsPageClient } from "./integrations-page-client";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IntegrationsPageClient />
    </Suspense>
  );
}
