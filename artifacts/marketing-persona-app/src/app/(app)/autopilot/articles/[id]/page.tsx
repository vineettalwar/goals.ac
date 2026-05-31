import { auth } from "@/auth";
import { db } from "@workspace/db";
import { scheduledArticlesTable, companiesTable, wordpressConnectionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ArticleActions } from "./article-actions";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);

  const rows = await db
    .select({ article: scheduledArticlesTable, company: companiesTable, wp: wordpressConnectionsTable })
    .from(scheduledArticlesTable)
    .innerJoin(companiesTable, eq(companiesTable.id, scheduledArticlesTable.companyId))
    .leftJoin(wordpressConnectionsTable, eq(wordpressConnectionsTable.companyId, companiesTable.id))
    .where(and(eq(scheduledArticlesTable.id, parseInt(id, 10)), eq(companiesTable.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  const { article, wp } = row;

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <Badge
            variant={
              article.status === "published" ? "default" :
              article.status === "ready" ? "success" :
              article.status === "failed" ? "destructive" : "muted"
            }
            className="mb-3 capitalize"
          >
            {article.status}
          </Badge>
          <h1 className="text-2xl font-bold leading-snug">{article.title ?? "Untitled"}</h1>
          {article.primaryKeyword && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              Primary keyword: <strong className="text-foreground">{article.primaryKeyword}</strong>
              {article.secondaryKeywords.length > 0 && (
                <> · {article.secondaryKeywords.join(", ")}</>
              )}
            </p>
          )}
        </div>
        <ArticleActions
          articleId={article.id}
          status={article.status}
          hasWordPress={!!wp?.isVerified}
          publishedUrl={article.publishedUrl ?? undefined}
        />
      </div>

      {/* Meta description */}
      {article.metaDescription && (
        <div className="mb-6 paper-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Meta description</p>
          <p className="text-sm">{article.metaDescription}</p>
          <p className="mt-1 text-xs text-muted-foreground">{article.metaDescription.length}/160 chars</p>
        </div>
      )}

      {/* Article body */}
      {article.bodyMarkdown ? (
        <div className="paper-card p-8">
          <div
            className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary"
            dangerouslySetInnerHTML={{
              __html: article.bodyMarkdown
                .replace(/^# .+\n?/m, "") // Strip H1 (shown above as page title)
                .split("\n")
                .map((line) => {
                  if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
                  if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
                  if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
                  if (line.trim() === "") return "<br/>";
                  return `<p>${line}</p>`;
                })
                .join("")
                .replace(/(<li>.*<\/li>)+/g, (match) => `<ul>${match}</ul>`),
            }}
          />
          {article.wordCount > 0 && (
            <p className="mt-6 text-xs text-muted-foreground border-t border-border pt-4">
              {article.wordCount.toLocaleString()} words
            </p>
          )}
        </div>
      ) : (
        <div className="paper-card flex items-center justify-center p-16 text-muted-foreground text-sm">
          {article.status === "generating" ? "Generating article content..." : "No content yet"}
        </div>
      )}
    </div>
  );
}
