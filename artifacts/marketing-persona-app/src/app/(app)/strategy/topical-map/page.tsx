import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const TopicalMapPanel = dynamic(
  () => import("@/components/panels/topical-map-panel").then((m) => m.TopicalMapPanel),
  { loading: () => <PageSkeleton /> },
);

export default function StrategyTopicalMapPage() {
  return <TopicalMapPanel embedded />;
}
