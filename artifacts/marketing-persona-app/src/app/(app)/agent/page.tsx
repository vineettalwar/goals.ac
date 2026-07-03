import { auth } from "@/auth";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ContentAgentPanel } from "@/components/content-agent-panel";

export default async function AgentPage() {
  const session = await auth();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId)).limit(1);
  if (!company) redirect("/onboarding");

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Content Agent</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Research topics, refine ideas, then build publication-ready articles in one flow.
        </p>
      </div>
      <ContentAgentPanel companyId={company.id} />
    </div>
  );
}
