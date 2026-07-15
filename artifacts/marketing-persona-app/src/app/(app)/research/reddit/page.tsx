import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const ResearchSignalsClient = dynamic(
  () =>
    import("@/components/research/research-signals-client").then((m) => m.ResearchSignalsClient),
  { loading: () => <PageSkeleton /> },
);

export default function ResearchSignalsPage() {
  return <ResearchSignalsClient />;
}
