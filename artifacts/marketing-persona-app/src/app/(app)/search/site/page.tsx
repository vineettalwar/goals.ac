import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const InternalLinksPanel = dynamic(
  () => import("@/components/panels/internal-links-panel").then((m) => m.InternalLinksPanel),
  { loading: () => <PageSkeleton /> },
);

export default function SearchSitePage() {
  return <InternalLinksPanel embedded />;
}
