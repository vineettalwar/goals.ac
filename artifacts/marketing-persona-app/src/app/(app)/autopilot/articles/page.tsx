import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { db } from "@workspace/db";
import {
  companiesTable,
  websiteProjectsTable,
  type ContentStyle,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { GenerateArticleButton } from "../generate-article-button";
import { languageLabel } from "@/lib/supported-languages";
import {
  AutopilotArticlesTable,
  AutopilotArticlesTableSkeleton,
} from "@/components/autopilot/autopilot-sections";

async function ArticlesLanguageBadge({ userId }: { userId: number }) {
  const [project] = await db
    .select({ contentStyle: websiteProjectsTable.contentStyle })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.userId, userId))
    .limit(1);
  const primaryLanguage = (project?.contentStyle as ContentStyle | null)?.primaryLanguage;
  const label = primaryLanguage && primaryLanguage !== "en" ? languageLabel(primaryLanguage) : null;
  if (!label) return null;
  return <Badge variant="muted" className="text-[10px]">{label}</Badge>;
}

export default async function ArticlesPage() {
  const session = await getSession();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);

  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);
  if (!company) redirect("/onboarding");

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Articles</h1>
          <Suspense fallback={null}>
            <ArticlesLanguageBadge userId={userId} />
          </Suspense>
        </div>
        <GenerateArticleButton companyId={company.id} />
      </div>

      <Suspense fallback={<AutopilotArticlesTableSkeleton />}>
        <AutopilotArticlesTable userId={userId} />
      </Suspense>
    </div>
  );
}
