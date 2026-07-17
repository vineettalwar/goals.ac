import { Suspense } from "react";
import { redirect } from "next/navigation";
import { projectIntegrationsPath } from "@workspace/app-shell/project-paths";
import { ProjectIntegrationsPageClient } from "../project-integrations-page-client";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const VALID_TABS = new Set(["cms", "social", "esp", "search"]);

export default async function ProjectIntegrationsTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const { id, tab } = await params;
  if (!VALID_TABS.has(tab)) {
    redirect(projectIntegrationsPath(id, "cms"));
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectIntegrationsPageClient projectId={id} tab={tab} />
    </Suspense>
  );
}
