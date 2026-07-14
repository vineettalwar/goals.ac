import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpArticleClient } from "@/components/marketing/pages/help/help-article-client";
import { HELP_ARTICLES, getHelpArticle } from "@/lib/marketing/content/help-articles";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) return { title: "Help | goals.ac" };
  return {
    title: `${article.title} | Help | goals.ac`,
    description: article.description,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();
  return <HelpArticleClient article={article} />;
}
