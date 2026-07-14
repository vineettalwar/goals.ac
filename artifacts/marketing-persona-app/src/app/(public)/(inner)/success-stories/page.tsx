import type { Metadata } from "next";
import { db } from "@workspace/db";
import { seoArticlesTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { SuccessStoriesPageClient, type PublicArticleExample } from "@/components/marketing/pages/company/success-stories-page-client";

export const metadata: Metadata = {
  title: "Customer Stories | goals.ac",
  description:
    "Customer case studies are coming soon. Explore live GEO audits, article quality demos, and the content studio while we onboard early clients.",
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
    // Build-time or offline — page shows "coming soon" without sample articles.
  }

  return <SuccessStoriesPageClient articles={articles} />;
}
