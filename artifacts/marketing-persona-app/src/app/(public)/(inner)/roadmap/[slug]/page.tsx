import type { Metadata } from "next";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const [roadmap] = await db
      .select({
        industry: roadmapsTable.industry,
        location: roadmapsTable.location,
        stage: roadmapsTable.stage,
        content: roadmapsTable.content,
      })
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (!roadmap) {
      return { title: "Roadmap not found" };
    }

    const content = roadmap.content as RoadmapContent;
    const summary = content.executiveSummary?.slice(0, 155);

    return {
      title: `${roadmap.industry} Growth Roadmap — ${roadmap.location}`,
      description:
        summary ??
        `Free 12-month SEO and content roadmap for ${roadmap.industry} in ${roadmap.location} (${roadmap.stage} stage).`,
      alternates: { canonical: `/roadmap/${slug}` },
      openGraph: {
        title: `${roadmap.industry} Growth Roadmap — ${roadmap.location}`,
        description:
          summary ??
          `Free 12-month SEO and content roadmap for ${roadmap.industry} in ${roadmap.location}.`,
      },
    };
  } catch {
    return { title: "Growth Roadmap" };
  }
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
