import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@workspace/db";
import { contentItemsTable, contentStrategiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ContentStrategyClient } from "@/components/marketing/pages/content/content-strategy-client";

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

async function loadContentStrategy(id: number) {
  const [strategy] = await db
    .select()
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.id, id))
    .limit(1);

  if (!strategy) return null;

  const items = await db
    .select()
    .from(contentItemsTable)
    .where(eq(contentItemsTable.strategyId, id))
    .orderBy(contentItemsTable.day);

  return {
    ...strategy,
    items,
    createdAt: strategy.createdAt.toISOString(),
  };
}

export default async function ContentStrategyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const strategyId = Number(id);
  if (Number.isNaN(strategyId)) notFound();

  const strategy = await loadContentStrategy(strategyId);
  if (!strategy) notFound();

  return <ContentStrategyClient strategy={strategy} />;
}
