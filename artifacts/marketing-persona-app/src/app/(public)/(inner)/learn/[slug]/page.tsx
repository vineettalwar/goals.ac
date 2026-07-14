import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LearnPostClient } from "@/components/marketing/pages/learn-post-client";
import { getLearnPost, LEARN_POSTS } from "@/lib/marketing/content/learn-posts";

export function generateStaticParams() {
  return LEARN_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getLearnPost(slug);
  if (!post) return { title: "Not found" };
  return { title: `${post.title} | goals.ac`, description: post.description };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getLearnPost(slug);
  if (!post) notFound();
  return <LearnPostClient post={post} />;
}
