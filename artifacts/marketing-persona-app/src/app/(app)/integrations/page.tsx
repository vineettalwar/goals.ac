import { redirect } from "next/navigation";
import { orgIntegrationsPath, projectIntegrationsPath } from "@workspace/app-shell";

const PROJECT_TABS = new Set(["cms", "social", "esp", "search"]);

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const projectRaw = params.project;
  const tabRaw = params.tab;
  const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;
  const tab = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;

  if (project) {
    const projectTab =
      tab && PROJECT_TABS.has(tab) ? (tab as "cms" | "social" | "esp" | "search") : "cms";
    redirect(projectIntegrationsPath(project, projectTab));
  }

  if (tab === "tools") {
    redirect(orgIntegrationsPath("tools"));
  }

  redirect(orgIntegrationsPath("ai"));
}
