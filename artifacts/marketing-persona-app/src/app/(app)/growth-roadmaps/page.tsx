import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Map, ArrowRight } from "lucide-react";
import { RoadmapGenerator } from "@/components/marketing/roadmap-generator";

export default async function AppRoadmapsPage() {
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
      .orderBy(desc(roadmapsTable.createdAt))
      .limit(50);
  } catch {
    // DB unavailable at build time
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Growth Roadmaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-generated 12-month B2B growth strategies. Generate new roadmaps or browse existing ones.
        </p>
      </div>

      <div className="mb-10">
        <RoadmapGenerator />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Browse roadmaps</h2>
        {roadmaps.length === 0 ? (
          <div className="paper-card rounded-xl flex flex-col items-center justify-center p-16 text-center">
            <Map className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No roadmaps yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate your first growth roadmap above
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roadmaps.map((r) => (
              <Link key={r.id} href={`/roadmap/${r.slug}`}>
                <div className="paper-card p-5 hover:bg-secondary/30 transition-colors">
                  <h3 className="font-semibold text-sm">{r.industry}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.location} · {r.stage} stage
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">{r.viewCount} views</span>
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      Read <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
