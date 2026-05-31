import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Phase {
  title: string;
  timeframe: string;
  objectives: string[];
  tactics: string[];
  kpis: string[];
}

interface RoadmapContent {
  executiveSummary?: string;
  phases?: Phase[];
}

export default async function PublicRoadmapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let roadmap: { id: number; industry: string; location: string; stage: string; content: unknown; viewCount: number } | undefined;

  try {
    [roadmap] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    // increment view count (fire-and-forget)
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
  const phases = content?.phases ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <div>
        <Link href="/roadmaps" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> All roadmaps
        </Link>
        <h1 className="text-3xl font-bold">{roadmap.industry} Growth Roadmap</h1>
        <p className="text-muted-foreground mt-1">{roadmap.location} · {roadmap.stage} stage</p>
      </div>

      {content?.executiveSummary && (
        <div className="paper-card rounded-xl p-6">
          <h2 className="font-semibold mb-2">Executive Summary</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{content.executiveSummary}</p>
        </div>
      )}

      <div className="space-y-4">
        {phases.map((phase, i) => (
          <div key={i} className="paper-card rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-lg">{phase.title}</h3>
              <p className="text-sm text-primary font-medium">{phase.timeframe}</p>
            </div>
            {phase.objectives?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Objectives</h4>
                <ul className="space-y-1.5">
                  {phase.objectives.map((o, j) => <li key={j} className="text-sm flex gap-2"><span className="text-primary">•</span>{o}</li>)}
                </ul>
              </div>
            )}
            {phase.tactics?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tactics</h4>
                <ul className="space-y-1.5">
                  {phase.tactics.map((t, j) => <li key={j} className="text-sm flex gap-2"><span className="text-muted-foreground">→</span>{t}</li>)}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="paper-card rounded-xl p-6 text-center space-y-3">
        <p className="font-semibold">Want a roadmap tailored to your business?</p>
        <p className="text-sm text-muted-foreground">Sign up free and generate a custom strategy in minutes.</p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium"
        >
          Get your free roadmap <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
