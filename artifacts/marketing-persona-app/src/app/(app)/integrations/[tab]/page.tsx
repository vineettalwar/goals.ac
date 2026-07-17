import { Suspense } from "react";
import { redirect } from "next/navigation";
import { orgIntegrationsPath } from "@workspace/app-shell/project-paths";
import { IntegrationsPageClient } from "../integrations-page-client";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

const VALID_TABS = new Set(["ai", "tools"]);

export default async function OrgIntegrationsTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!VALID_TABS.has(tab)) {
    redirect(orgIntegrationsPath("ai"));
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <IntegrationsPageClient tab={tab} />
    </Suspense>
  );
}
