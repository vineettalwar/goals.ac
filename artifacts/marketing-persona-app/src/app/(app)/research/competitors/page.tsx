import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const ResearchCompetitorsClient = dynamic(
  () =>
    import("@/components/research/research-competitors-client").then(
      (m) => m.ResearchCompetitorsClient,
    ),
  { loading: () => <PageSkeleton /> },
);

export default function ResearchCompetitorsPage() {
  return <ResearchCompetitorsClient />;
}
