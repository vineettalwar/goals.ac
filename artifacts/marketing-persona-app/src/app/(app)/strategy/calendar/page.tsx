import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/page-skeleton";

const ContentStrategiesPanel = dynamic(
  () => import("@/components/panels/content-strategies-panel").then((m) => m.ContentStrategiesPanel),
  { loading: () => <PageSkeleton /> },
);

export default function StrategyCalendarPage() {
  return <ContentStrategiesPanel embedded />;
}
