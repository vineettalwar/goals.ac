import type { Metadata } from "next";
import { ArticleQualityDemoClient } from "@/components/marketing/pages/article-quality-demo-client";

export const metadata: Metadata = {
  title: "Article Quality Score | Inspectable SEO Drafts",
  description: "See how goals.ac scores every article: structure, citations, FAQ, schema, and internal links. Humanization pass included.",
};

export default function ArticleQualityPage() {
  return <ArticleQualityDemoClient />;
}
