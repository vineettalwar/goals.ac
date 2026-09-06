import "server-only";

import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export type RoadmapDetailContent = {
  executiveSummary?: string;
  phases?: {
    title: string;
    timeframe: string;
    objectives: string[];
    tactics: string[];
    kpis: string[];
  }[];
};

export type RoadmapDetailRecord = {
  id: number;
  industry: string;
  location: string;
  stage: string;
  content: RoadmapDetailContent;
};

export async function loadRoadmapBySlug(slug: string): Promise<RoadmapDetailRecord | null> {
  try {
    const [roadmap] = await db
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

    if (!roadmap) return null;

    return {
      id: roadmap.id,
      industry: roadmap.industry,
      location: roadmap.location,
      stage: roadmap.stage,
      content: (roadmap.content ?? {}) as RoadmapDetailContent,
    };
  } catch {
    return null;
  }
}
