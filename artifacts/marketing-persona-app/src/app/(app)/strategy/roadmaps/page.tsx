import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { GrowthRoadmapsClient } from "@/components/growth-roadmaps/growth-roadmaps-client";

export default function StrategyRoadmapsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GrowthRoadmapsClient embedded />
    </Suspense>
  );
}
