import type { Metadata } from "next";
import { db } from "@workspace/db";
import { seoArticlesTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { SuccessStoriesPageClient, type PublicArticleExample } from "@/components/marketing/pages/company/success-stories-page-client";
import { getPublishedStories } from "@/lib/marketing/content/success-stories";

export const metadata: Metadata = {
  title: "Customer Stories | goals.ac",
  description:
    "Verified-results template with Search Console, Ahrefs, and ChatGPT verify CTAs. Named customer stories publish only with permission — no empty claims.",
};

export default async function Page() {
  let articles: PublicArticleExample[] = [];

  try {
    const rows = await db
      .select({
        id: seoArticlesTable.id,
        title: seoArticlesTable.title,
        primaryKeyword: seoArticlesTable.primaryKeyword,
        wordCount: seoArticlesTable.wordCount,
      })
      .from(seoArticlesTable)
      .orderBy(desc(seoArticlesTable.createdAt))
      .limit(5);
    articles = rows.map((row) => ({
      id: row.id,
      title: row.title,
      primaryKeyword: row.primaryKeyword ?? "",
      wordCount: row.wordCount ?? 0,
    }));
  } catch {
    // Build-time or offline — page shows demos without sample articles.
  }

  return (
    <SuccessStoriesPageClient articles={articles} publishedStories={getPublishedStories()} />
  );
}
