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
      <SeoChatPanel />
    </Suspense>
  );
}
