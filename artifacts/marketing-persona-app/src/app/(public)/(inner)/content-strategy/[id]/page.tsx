import { ContentStrategyClient } from "@/components/marketing/content-strategy-client";

export default async function ContentStrategyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentStrategyClient id={id} />;
}
