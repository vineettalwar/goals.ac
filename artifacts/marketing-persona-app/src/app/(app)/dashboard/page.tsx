import { Suspense } from "react";
import { getSession } from "@/auth";
import {
  DashboardArticlesSkeleton,
  DashboardAutopilotLink,
  DashboardProjectSubtitle,
  DashboardDrafts,
  DashboardDraftsSkeleton,
  DashboardProjects,
  DashboardProjectsSkeleton,
  DashboardRecentArticles,
  DashboardStats,
  DashboardStatsSkeleton,
} from "@/components/dashboard/dashboard-sections";
import { resolveActiveProjectId } from "@/lib/active-project/server";
import { getSupportOrganizationId } from "@/lib/org/project-scope";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const activeProjectId = await resolveActiveProjectId(
    userId,
    getSupportOrganizationId(session),
  );
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
          <DashboardProjectSubtitle userId={userId} projectId={activeProjectId} />
        </Suspense>
      </div>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats userId={userId} projectId={activeProjectId} />
      </Suspense>

      {activeProjectId ? (
        <>
          <Suspense fallback={null}>
            <DashboardAutopilotLink userId={userId} projectId={activeProjectId} />
          </Suspense>

          <Suspense fallback={<DashboardDraftsSkeleton />}>
            <DashboardDrafts userId={userId} projectId={activeProjectId} />
          </Suspense>
        </>
      ) : null}

      <Suspense fallback={<DashboardArticlesSkeleton />}>
        <DashboardRecentArticles userId={userId} projectId={activeProjectId} />
      </Suspense>

      {activeProjectId ? (
        <Suspense fallback={<DashboardProjectsSkeleton />}>
          <DashboardProjects userId={userId} projectId={activeProjectId} />
        </Suspense>
      ) : null}
    </div>
  );
}
