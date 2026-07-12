import type { Metadata } from "next";
import { ContentStrategyClient } from "@/components/marketing/content-strategy-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Content Strategy #${id}`,
    description: "AI-generated content strategy and editorial calendar.",
    robots: { index: false, follow: false },
  };
}

export default async function ContentStrategyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentStrategyClient id={id} />;
}
