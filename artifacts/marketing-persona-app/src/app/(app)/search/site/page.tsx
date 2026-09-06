import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const InternalLinksPanel = dynamic(
  () => import("@/components/panels/internal-links-panel").then((m) => m.InternalLinksPanel),
  { loading: () => <PageSkeleton /> },
);

const SiteAuditPanel = dynamic(
  () => import("@/components/panels/site-audit-panel").then((m) => m.SiteAuditPanel),
  { loading: () => <PageSkeleton /> },
);

const BacklinksOverviewPanel = dynamic(
  () =>
    import("@/components/panels/backlinks-overview-panel").then(
      (m) => m.BacklinksOverviewPanel,
    ),
  { loading: () => <PageSkeleton /> },
);

export default function SearchSitePage() {
  return (
    <div className="space-y-8">
      <SiteAuditPanel />
      <BacklinksOverviewPanel />
      <InternalLinksPanel embedded />
    </div>
  );
}
