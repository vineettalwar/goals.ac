import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const KeywordTrackingPanel = dynamic(
  () => import("@/components/panels/keyword-tracking-panel").then((m) => m.KeywordTrackingPanel),
  { loading: () => <PageSkeleton /> },
);

/** Default Search hub tab — keywords (ranks, analysis, gaps). */
export default function SearchPage() {
  return <KeywordTrackingPanel embedded />;
}
