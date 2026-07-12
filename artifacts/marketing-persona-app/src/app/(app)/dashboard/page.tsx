import { Suspense } from "react";
import { getSession } from "@/auth";
import {
  DashboardArticlesSkeleton,
  DashboardAutopilotLink,
  DashboardCompanySubtitle,
  DashboardDrafts,
  DashboardDraftsSkeleton,
  DashboardProjects,
  DashboardProjectsSkeleton,
  DashboardRecentArticles,
  DashboardStats,
  DashboardStatsSkeleton,
  DashboardVisibility,
  DashboardVisibilitySkeleton,
} from "@/components/dashboard/dashboard-sections";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {greeting}, {session.user.name?.split(" ")[0]}
        </h1>
        <Suspense fallback={null}>
          <DashboardCompanySubtitle userId={userId} />
        </Suspense>
      </div>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats userId={userId} />
      </Suspense>

      <Suspense fallback={null}>
        <DashboardAutopilotLink userId={userId} />
      </Suspense>

      <Suspense fallback={<DashboardVisibilitySkeleton />}>
        <DashboardVisibility userId={userId} />
      </Suspense>

      <Suspense fallback={<DashboardDraftsSkeleton />}>
        <DashboardDrafts userId={userId} />
      </Suspense>

      <Suspense fallback={<DashboardArticlesSkeleton />}>
        <DashboardRecentArticles userId={userId} />
      </Suspense>

      <Suspense fallback={<DashboardProjectsSkeleton />}>
        <DashboardProjects userId={userId} />
      </Suspense>
    </div>
  );
}
