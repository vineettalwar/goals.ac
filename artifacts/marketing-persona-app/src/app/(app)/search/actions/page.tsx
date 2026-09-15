import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const ActionQueuePanel = dynamic(
  () => import("@/components/panels/action-queue-panel").then((m) => m.ActionQueuePanel),
  { loading: () => <PageSkeleton /> },
);

export default function SearchActionsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ActionQueuePanel />
    </Suspense>
  );
}
