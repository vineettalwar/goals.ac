import { notFound } from "next/navigation";
import { RoadmapDetailApp } from "@/components/growth-roadmaps/roadmap-detail-app";
import { loadRoadmapBySlug } from "@/lib/growth-roadmaps/load-roadmap";

export default async function AppRoadmapDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const roadmap = await loadRoadmapBySlug(slug);
  if (!roadmap) notFound();

  return (
    <RoadmapDetailApp
      roadmapId={roadmap.id}
      slug={slug}
      industry={roadmap.industry}
      location={roadmap.location}
      stage={roadmap.stage}
      content={roadmap.content}
    />
  );
}
