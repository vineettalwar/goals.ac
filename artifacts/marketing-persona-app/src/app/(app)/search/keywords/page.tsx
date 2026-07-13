import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";

const KeywordTrackingPanel = dynamic(
  () => import("@/components/panels/keyword-tracking-panel").then((m) => m.KeywordTrackingPanel),
  { loading: () => <PageSkeleton /> },
);

export default function SearchKeywordsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <KeywordTrackingPanel embedded />
    </Suspense>
  );
}
