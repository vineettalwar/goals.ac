import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { Zap } from "lucide-react";
import { GenerateArticleButton } from "./generate-article-button";
import {
  AutopilotContent,
  AutopilotContentSkeleton,
} from "@/components/autopilot/autopilot-sections";

export default async function AutopilotPage() {
  const session = await getSession();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);

  const [company] = await db
    .select({ id: companiesTable.id, name: companiesTable.name })
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  if (!company) redirect("/onboarding");

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" /> Autopilot
          </h1>
          <p className="mt-1 text-muted-foreground">
            {company.name} · Automated SEO content pipeline
          </p>
        </div>
        <GenerateArticleButton companyId={company.id} />
      </div>

      <Suspense fallback={<AutopilotContentSkeleton />}>
        <AutopilotContent userId={userId} />
      </Suspense>
    </div>
  );
}
