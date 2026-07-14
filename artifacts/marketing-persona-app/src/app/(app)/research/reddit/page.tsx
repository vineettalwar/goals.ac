import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const RedditDiscoveryPanel = dynamic(
  () => import("@/components/panels/reddit-discovery-panel").then((m) => m.RedditDiscoveryPanel),
  { loading: () => <PageSkeleton /> },
);

export default function ResearchRedditPage() {
  return <RedditDiscoveryPanel embedded />;
}
