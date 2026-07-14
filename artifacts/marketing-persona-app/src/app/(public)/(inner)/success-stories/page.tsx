import type { Metadata } from "next";
import { db } from "@workspace/db";
import { seoArticlesTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { SuccessStoriesPageClient } from "@/components/marketing/pages/company/success-stories-page-client";

export const metadata: Metadata = {
  title: "Customer Stories | goals.ac",
  description:
    "Customer case studies are coming soon. Explore live GEO audits, article quality demos, and the content studio while we onboard early clients.",
};

export default async function Page() {
  const articles = await db
    .select({
      id: seoArticlesTable.id,
      title: seoArticlesTable.title,
      primaryKeyword: seoArticlesTable.primaryKeyword,
      wordCount: seoArticlesTable.wordCount,
    })
    .from(seoArticlesTable)
    .orderBy(desc(seoArticlesTable.createdAt))
    .limit(5);

  return <SuccessStoriesPageClient articles={articles} />;
}
