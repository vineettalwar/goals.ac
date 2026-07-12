import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/page-skeleton";

const GrowthRoadmapsClient = dynamic(
  () =>
    import("@/components/growth-roadmaps/growth-roadmaps-client").then((m) => m.GrowthRoadmapsClient),
  { loading: () => <PageSkeleton /> },
);

export default function StrategyRoadmapsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GrowthRoadmapsClient embedded />
    </Suspense>
  );
}
