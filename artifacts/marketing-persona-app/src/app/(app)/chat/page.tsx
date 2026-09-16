import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const SeoChatPanel = dynamic(
  () => import("@/components/panels/seo-chat-panel").then((m) => m.SeoChatPanel),
  { loading: () => <PageSkeleton /> },
);

export default function ChatPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 flex flex-col">
          <SeoChatPanel />
        </div>
      </div>
    </Suspense>
  );
}
