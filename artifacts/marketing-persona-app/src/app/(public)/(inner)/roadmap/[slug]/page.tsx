import { notFound } from "next/navigation";
import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { RoadmapDetailClient } from "@/components/marketing/roadmap-detail-client";

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

export default async function PublicRoadmapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let roadmap:
    | { id: number; industry: string; location: string; stage: string; content: unknown; viewCount: number }
    | undefined;

  try {
    [roadmap] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (roadmap) {
      db.update(roadmapsTable)
        .set({ viewCount: roadmap.viewCount + 1 })
        .where(eq(roadmapsTable.id, roadmap.id))
        .catch(() => {});
    }
  } catch {
    notFound();
  }

  if (!roadmap) notFound();

  const content = roadmap.content as RoadmapContent;

  return (
    <RoadmapDetailClient
      slug={slug}
      industry={roadmap.industry}
      location={roadmap.location}
      stage={roadmap.stage}
      content={content}
    />
  );
}
