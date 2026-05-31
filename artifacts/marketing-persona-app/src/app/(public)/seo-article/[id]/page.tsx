import { notFound } from "next/navigation";
import { db } from "@workspace/db";
import { seoArticlesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export default async function PublicSeoArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) notFound();

  let article: { title: string; content: string; metaDescription: string; primaryKeyword: string; wordCount: number; createdAt: Date } | undefined;

  try {
    [article] = await db
      .select({
        title: seoArticlesTable.title,
        content: seoArticlesTable.content,
        metaDescription: seoArticlesTable.metaDescription,
        primaryKeyword: seoArticlesTable.primaryKeyword,
        wordCount: seoArticlesTable.wordCount,
        createdAt: seoArticlesTable.createdAt,
      })
      .from(seoArticlesTable)
      .where(eq(seoArticlesTable.id, numericId))
      .limit(1);
  } catch {
    notFound();
  }

  if (!article) notFound();

  return (
    <article className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-8 space-y-3">
        <h1 className="text-4xl font-bold leading-tight">{article.title}</h1>
        {article.metaDescription && (
          <p className="text-lg text-muted-foreground leading-relaxed">{article.metaDescription}</p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{article.wordCount} words</span>
          <span>·</span>
          <span>{new Date(article.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </header>

      <div
        className="prose prose-sm max-w-none leading-relaxed"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </article>
  );
}
