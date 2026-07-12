import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { RoadmapsPageClient } from "@/components/marketing/roadmaps-page-client";

export const revalidate = 60;

export default async function PublicRoadmapsPage() {
  let roadmaps: {
    id: number;
    slug: string;
    industry: string;
    location: string;
    stage: string;
    viewCount: number;
  }[] = [];

  try {
    roadmaps = await db
      .select({
        id: roadmapsTable.id,
        slug: roadmapsTable.slug,
        industry: roadmapsTable.industry,
        location: roadmapsTable.location,
        stage: roadmapsTable.stage,
        viewCount: roadmapsTable.viewCount,
      })
      .from(roadmapsTable)
      .orderBy(desc(roadmapsTable.viewCount))
      .limit(50);
  } catch {
    // DB not available at build time — render empty
  }

  return <RoadmapsPageClient roadmaps={roadmaps} />;
}
