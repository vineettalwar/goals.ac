import type { Metadata } from "next";
import { ArticleQualityDemoClient } from "@/components/marketing/pages/tools/article-quality-demo-client";

export const metadata: Metadata = {
  title: "Article Quality Score | Inspectable SEO Drafts",
  description:
    "See how goals.ac scores every article: structure, citations, FAQ, schema, and internal links. Side-by-side before/after humanize demo with AI-tell counts.",
};

export default function ArticleQualityPage() {
  return <ArticleQualityDemoClient />;
}
