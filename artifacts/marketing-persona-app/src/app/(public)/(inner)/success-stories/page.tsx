import type { Metadata } from "next";
import { db } from "@workspace/db";
import { seoArticlesTable, roadmapsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { SuccessStoriesPageClient } from "@/components/marketing/success-stories-page-client";

export const metadata: Metadata = {
  title: "Success Stories — goals.ac",
  description: "See how B2B teams use goals.ac for organic growth and AI visibility.",
};

export default async function Page() {
  const [articles, roadmaps] = await Promise.all([
    db
      .select({
        id: seoArticlesTable.id,
        title: seoArticlesTable.title,
        primaryKeyword: seoArticlesTable.primaryKeyword,
        wordCount: seoArticlesTable.wordCount,
      })
      .from(seoArticlesTable)
      .orderBy(desc(seoArticlesTable.createdAt))
      .limit(5),
    db
      .select({
        slug: roadmapsTable.slug,
        industry: roadmapsTable.industry,
        location: roadmapsTable.location,
      })
      .from(roadmapsTable)
      .orderBy(desc(roadmapsTable.createdAt))
      .limit(5),
  ]);

  return <SuccessStoriesPageClient articles={articles} roadmaps={roadmaps} />;
}
