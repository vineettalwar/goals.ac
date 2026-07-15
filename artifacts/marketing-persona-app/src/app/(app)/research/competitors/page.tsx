import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const CompetitorAnalysisPanel = dynamic(
  () => import("@/components/panels/competitor-analysis-panel").then((m) => m.CompetitorAnalysisPanel),
  { loading: () => <PageSkeleton /> },
);

export default function ResearchCompetitorsPage() {
  return <CompetitorAnalysisPanel embedded />;
}
