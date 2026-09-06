import dynamic from "next/dynamic";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/active-project/cookie";

const RefreshQueuePanel = dynamic(
  () => import("@/components/panels/refresh-queue-panel").then((m) => m.RefreshQueuePanel),
  { loading: () => <PageSkeleton /> },
);

export default async function SearchRefreshPage() {
  const cookieStore = await cookies();
  const projectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;
  if (!projectId) {
    redirect("/projects");
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <RefreshQueuePanel embedded />
    </Suspense>
  );
}
