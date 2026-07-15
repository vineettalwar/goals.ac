import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const GeoAuditPanel = dynamic(
  () => import("@/components/panels/geo-audit-panel").then((m) => m.GeoAuditPanel),
  { loading: () => <PageSkeleton /> },
);

export default function AuditPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GeoAuditPanel />
    </Suspense>
  );
}
