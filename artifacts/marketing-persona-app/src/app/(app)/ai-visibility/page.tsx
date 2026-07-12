import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/page-skeleton";

const AiVisibilityDashboard = dynamic(
  () =>
    import("@/components/ai-visibility-dashboard").then((m) => m.AiVisibilityDashboard),
  { loading: () => <PageSkeleton /> },
);

export default function AiVisibilityPage() {
  return <AiVisibilityDashboard />;
}
