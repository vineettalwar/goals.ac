import type { Metadata } from "next";
import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { RoadmapsPageClient } from "@/components/marketing/roadmaps-page-client";

export const metadata: Metadata = {
  title: "Growth Roadmaps",
  description: "Browse free 12-month SEO and content growth roadmaps by industry, location, and startup stage.",
};

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
