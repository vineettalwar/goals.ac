import type { Metadata } from "next";
import { ArticleQualityDemoClient } from "@/components/marketing/article-quality-demo-client";

export const metadata: Metadata = {
  title: "Article Quality Score — Inspectable SEO Drafts",
  description: "See how goals.ac scores every article for structure, citations, FAQ, schema, and internal links — with humanization built in.",
};

export default function ArticleQualityPage() {
  return <ArticleQualityDemoClient />;
}
