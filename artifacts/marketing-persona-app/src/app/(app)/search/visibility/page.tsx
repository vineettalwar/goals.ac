import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const AiVisibilityDashboard = dynamic(
  () => import("@/components/visibility/ai-visibility-dashboard").then((m) => m.AiVisibilityDashboard),
  { loading: () => <PageSkeleton /> },
);

export default function SearchVisibilityPage() {
  return <AiVisibilityDashboard embedded />;
}
