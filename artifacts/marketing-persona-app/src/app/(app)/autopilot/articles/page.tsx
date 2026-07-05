import { auth } from "@/auth";
import { db } from "@workspace/db";
import { scheduledArticlesTable, companiesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { GenerateArticleButton } from "../generate-article-button";

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  ready: "success",
  published: "default",
  generating: "warning",
  pending: "muted",
  failed: "destructive",
};

export default async function ArticlesPage() {
  const session = await auth();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId)).limit(1);
  if (!company) redirect("/onboarding");

  const articles = await db
    .select()
    .from(scheduledArticlesTable)
    .where(eq(scheduledArticlesTable.companyId, company.id))
    .orderBy(desc(scheduledArticlesTable.createdAt));

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Articles</h1>
        <GenerateArticleButton companyId={company.id} />
      </div>

      {articles.length === 0 ? (
        <div className="paper-card flex items-center justify-center p-16 text-muted-foreground text-sm">
          No articles yet. Click &ldquo;Generate article&rdquo; to create your first one.
        </div>
      ) : (
        <div className="paper-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Primary keyword</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Words</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">AI Source</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Est. Cost</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article, i) => {
                const metadata = (article.articleMetadata ?? {}) as {
                  generationSource?: "user-key" | "replit-proxy" | "platform-key";
                  estimatedCostUsd?: number;
                };
                return (
                  <tr key={article.id} className={i < articles.length - 1 ? "border-b border-border" : ""}>
                  <td className="px-4 py-3 max-w-xs">
                    <Link href={`/autopilot/articles/${article.id}`} className="hover:underline font-medium line-clamp-1">
                      {article.title ?? "Generating..."}
                    </Link>
                    {article.publishedUrl && (
                      <a href={article.publishedUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-xs text-muted-foreground hover:text-foreground">
                        {article.publishedUrl}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{article.primaryKeyword ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={STATUS_BADGE[article.status] ?? "muted"} className="capitalize">{article.status}</Badge>
                      {article.humanized && <Badge variant="secondary">Humanized</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{article.wordCount > 0 ? article.wordCount.toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {metadata.generationSource === "user-key" ? "Your key" : metadata.generationSource ? "Platform" : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {typeof metadata.estimatedCostUsd === "number" ? `~$${metadata.estimatedCostUsd.toFixed(4)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(article.createdAt).toLocaleDateString()}
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
