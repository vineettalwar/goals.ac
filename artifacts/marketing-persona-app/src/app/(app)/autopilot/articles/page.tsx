import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { type ContentStyle } from "@workspace/db/schema";
import { listAccessibleProjects } from "@/lib/org/org-access";
import { getSupportOrganizationId } from "@/lib/org/project-scope";
import { Badge } from "@/components/ui/badge";
import { GenerateArticleButton } from "../generate-article-button";
import { languageLabel } from "@/lib/utils/supported-languages";
import {
  AutopilotArticlesTable,
  AutopilotArticlesTableSkeleton,
} from "@/components/autopilot/autopilot-sections";

async function ArticlesLanguageBadge({
  userId,
  supportOrganizationId,
}: {
  userId: number;
  supportOrganizationId: number | null;
}) {
  const projects = await listAccessibleProjects(userId, supportOrganizationId);
  const project = projects[0];
  const primaryLanguage = (project?.contentStyle as ContentStyle | null)?.primaryLanguage;
  const label = primaryLanguage && primaryLanguage !== "en" ? languageLabel(primaryLanguage) : null;
  if (!label) return null;
  return <Badge variant="muted" className="text-[10px]">{label}</Badge>;
}

export default async function ArticlesPage() {
  const session = await getSession();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);
  const supportOrganizationId = getSupportOrganizationId(session);
  const companyId = session.user.companyId;
  if (!companyId) redirect("/onboarding");

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Articles</h1>
          <Suspense fallback={null}>
            <ArticlesLanguageBadge userId={userId} supportOrganizationId={supportOrganizationId} />
          </Suspense>
        </div>
        <GenerateArticleButton companyId={companyId} />
      </div>

      <Suspense fallback={<AutopilotArticlesTableSkeleton />}>
        <AutopilotArticlesTable userId={userId} />
      </Suspense>
    </div>
  );
}
