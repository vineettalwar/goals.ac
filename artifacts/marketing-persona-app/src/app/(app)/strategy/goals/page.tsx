import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const GoalsPanel = dynamic(
  () => import("@/components/panels/goals-panel").then((m) => m.GoalsPanel),
  { loading: () => <PageSkeleton /> },
);

export default function StrategyGoalsPage() {
  return <GoalsPanel embedded />;
}
