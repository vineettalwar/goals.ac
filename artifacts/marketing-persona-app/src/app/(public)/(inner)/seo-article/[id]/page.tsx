import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@workspace/db";
import { seoArticlesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { SeoArticleClient } from "@/components/marketing/pages/seo-article-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return {};

  const [row] = await db
    .select({ title: seoArticlesTable.title, metaDescription: seoArticlesTable.metaDescription })
    .from(seoArticlesTable)
    .where(eq(seoArticlesTable.id, numericId))
    .limit(1);

  if (!row) return {};
  return { title: row.title, description: row.metaDescription ?? undefined };
}

export default async function PublicSeoArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) notFound();

  let article:
    | {
        title: string;
        content: string;
        metaDescription: string;
        primaryKeyword: string;
        wordCount: number;
        createdAt: Date;
      }
    | undefined;

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
    <SeoArticleClient
      title={article.title}
      content={article.content}
      metaDescription={article.metaDescription}
      primaryKeyword={article.primaryKeyword}
      wordCount={article.wordCount}
      createdAt={article.createdAt.toISOString()}
    />
  );
}
