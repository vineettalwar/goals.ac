import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/page-skeleton";

const GeoAuditPanel = dynamic(
  () => import("@/components/panels/geo-audit-panel").then((m) => m.GeoAuditPanel),
  { loading: () => <PageSkeleton /> },
);

export default function AuditPage() {
  return <GeoAuditPanel />;
}
