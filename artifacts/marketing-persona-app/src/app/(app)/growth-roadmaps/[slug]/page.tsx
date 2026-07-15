import { notFound } from "next/navigation";
import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { RoadmapDetailApp } from "@/components/growth-roadmaps/roadmap-detail-app";

interface RoadmapContent {
  executiveSummary?: string;
  phases?: {
    title: string;
    timeframe: string;
    objectives: string[];
    tactics: string[];
    kpis: string[];
  }[];
}

export default async function AppRoadmapDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let roadmap:
    | {
        id: number;
        industry: string;
        location: string;
        stage: string;
        content: unknown;
      }
    | undefined;

  try {
    [roadmap] = await db
      .select({
        id: roadmapsTable.id,
        industry: roadmapsTable.industry,
        location: roadmapsTable.location,
        stage: roadmapsTable.stage,
        content: roadmapsTable.content,
      })
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);
  } catch {
    notFound();
  }

  if (!roadmap) notFound();

  const content = roadmap.content as RoadmapContent;

  return (
    <RoadmapDetailApp
      roadmapId={roadmap.id}
      slug={slug}
      industry={roadmap.industry}
      location={roadmap.location}
      stage={roadmap.stage}
      content={content}
    />
  );
}
