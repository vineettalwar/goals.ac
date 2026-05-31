import Link from "next/link";
import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { Map, ArrowRight } from "lucide-react";
import { GenerateRoadmapButton } from "./generate-button";

export const revalidate = 60;

export default async function PublicRoadmapsPage() {
  let roadmaps: { id: number; slug: string; industry: string; location: string; stage: string; viewCount: number }[] = [];

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Growth Roadmaps</h1>
          <p className="text-muted-foreground">AI-generated 12-month B2B growth strategies. Free to browse and share.</p>
        </div>
        <GenerateRoadmapButton />
      </div>

      {roadmaps.length === 0 ? (
        <div className="paper-card rounded-xl flex flex-col items-center justify-center p-16 text-center">
          <Map className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No roadmaps yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Generate your first growth roadmap above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roadmaps.map((r) => (
            <Link key={r.id} href={`/roadmap/${r.slug}`}>
              <div className="paper-card rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
                <h3 className="font-semibold">{r.industry}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{r.location} · {r.stage} stage</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{r.viewCount} views</span>
                  <span className="text-xs text-primary font-medium flex items-center gap-1">Read <ArrowRight className="h-3 w-3" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
