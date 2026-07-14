import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FreeToolPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";
import { FREE_TOOLS, FREE_TOOL_LIST, type FreeToolSlug } from "@/lib/marketing/site/free-tools";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return FREE_TOOL_LIST.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = FREE_TOOLS[slug as FreeToolSlug];
  if (!tool) return {};
  return {
    title: tool.metaTitle,
    description: tool.metaDescription,
  };
}

export default async function FreeToolPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tool = FREE_TOOLS[slug as FreeToolSlug];
  if (!tool) notFound();
  return <FreeToolPageDynamic slug={tool.slug} />;
}
