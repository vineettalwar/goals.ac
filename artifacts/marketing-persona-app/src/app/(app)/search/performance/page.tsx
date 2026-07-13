import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";

const ArticlePerformancePanel = dynamic(
  () =>
    import("@/components/panels/article-performance-panel").then((m) => m.ArticlePerformancePanel),
  { loading: () => <PageSkeleton /> },
);

export default function SearchPerformancePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ArticlePerformancePanel embedded />
    </Suspense>
  );
}
