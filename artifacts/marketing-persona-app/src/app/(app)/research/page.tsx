import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const ResearchOverviewClient = dynamic(
  () =>
    import("@/components/research/research-overview-client").then((m) => m.ResearchOverviewClient),
  { loading: () => <PageSkeleton /> },
);

export default function ResearchPage() {
  return <ResearchOverviewClient />;
}
