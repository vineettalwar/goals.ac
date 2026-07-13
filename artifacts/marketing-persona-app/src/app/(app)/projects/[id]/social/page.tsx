import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";

const SocialHubClient = dynamic(
  () => import("@/components/social/social-hub-client").then((m) => m.SocialHubClient),
  { loading: () => <PageSkeleton /> },
);

export default async function SocialHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SocialHubClient projectId={id} />
    </Suspense>
  );
}
