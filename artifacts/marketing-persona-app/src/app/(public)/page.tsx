import type { Metadata } from "next";
import { db } from "@workspace/db";
import { seoArticlesTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { HomePageClient } from "@/components/marketing/pages/home/home-page-client";
import type { ShowcaseArticle } from "@/components/marketing/sections/home-marketing-sections";

export const metadata: Metadata = {
  title: "goals.ac | Research-driven SEO content studio",
  description:
    "Cross-platform content studio for B2B teams. Research-backed SEO briefs, drafts you approve, and publishing to CMS, social, and email — saving you time end to end.",
};

async function loadShowcaseArticle(): Promise<ShowcaseArticle | null> {
  if (process.env.MARKETING_STATIC === "1") {
    return null;
  }
  try {
    const [article] = await db
      .select({
        id: seoArticlesTable.id,
        title: seoArticlesTable.title,
        primaryKeyword: seoArticlesTable.primaryKeyword,
        wordCount: seoArticlesTable.wordCount,
      })
      .from(seoArticlesTable)
      .orderBy(desc(seoArticlesTable.createdAt))
      .limit(1);

    return article ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const showcaseArticle = await loadShowcaseArticle();
  return <HomePageClient showcaseArticle={showcaseArticle} />;
}
