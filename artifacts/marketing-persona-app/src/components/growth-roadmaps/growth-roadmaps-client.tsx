"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ChevronDown, ChevronUp, Map, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import dynamic from "next/dynamic";
import { useActiveProject } from "@/context/active-project";
import { useProjectContent, useRoadmapsCatalog, useWebsiteProject } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import { clearRoadmapIntent, readRoadmapIntent, type RoadmapIntent } from "@/lib/projects/roadmap-intent";

const RoadmapGeneratorApp = dynamic(
  () => import("./roadmap-generator-app").then((m) => m.RoadmapGeneratorApp),
  { loading: () => <div className="paper-card p-8 animate-pulse h-64 rounded-xl bg-secondary/40" /> },
);

interface RoadmapSummary {
  id: number;
  slug: string;
  industry: string;
  location: string;
  stage: string;
  viewCount?: number;
}

interface GrowthRoadmapsClientProps {
  embedded?: boolean;
}

export function GrowthRoadmapsClient({ embedded = false }: GrowthRoadmapsClientProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [storedIntent, setStoredIntent] = useState<RoadmapIntent | null>(null);
  const { activeProjectId, activeProject, isLoading: projectLoading, refreshProjects } = useActiveProject();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [pinningId, setPinningId] = useState<number | null>(null);

  const {
    data: projectContent,
    isLoading: loadingProject,
    isFetching: fetchingProject,
  } = useProjectContent(activeProjectId);
  const { data: websiteProject } = useWebsiteProject(activeProjectId);
  const { data: catalogRoadmaps = [], isLoading: loadingCatalog } = useRoadmapsCatalog(catalogOpen);

  useEffect(() => {
    const intent = readRoadmapIntent();
    if (intent) {
      setStoredIntent(intent);
      clearRoadmapIntent();
      void refreshProjects();
    }
  }, [refreshProjects]);

  const projectRoadmaps = (projectContent?.roadmaps ?? []) as RoadmapSummary[];
  const signupIndustry =
    searchParams.get("industry")?.trim() || storedIntent?.industry?.trim() || undefined;
  const signupLocation =
    searchParams.get("location")?.trim() || storedIntent?.location?.trim() || undefined;
  const signupStage =
    searchParams.get("stage")?.trim() || storedIntent?.stage?.trim() || undefined;
  const defaultIndustry = useMemo(() => {
    if (signupIndustry) return signupIndustry;
    const brandProfile = websiteProject?.brandProfile as { industry?: string } | undefined;
    if (typeof brandProfile?.industry === "string" && brandProfile.industry.trim()) {
      return brandProfile.industry.trim();
    }
    return undefined;
  }, [signupIndustry, websiteProject]);
  const defaultLocation = signupLocation;
  const defaultStage = signupStage;

  async function refreshProjectRoadmaps() {
    if (!activeProjectId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectContent(activeProjectId) });
  }

  async function pinRoadmap(roadmapId: number) {
    if (!activeProjectId) return;
    setPinningId(roadmapId);
    try {
      const res = await fetch(`/api/website-projects/${activeProjectId}/roadmaps/${roadmapId}`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Failed to pin roadmap");
        return;
      }
      toast.success("Roadmap pinned to project");
      await refreshProjectRoadmaps();
    } catch {
      toast.error("Failed to pin roadmap");
    } finally {
      setPinningId(null);
    }
  }

  async function unpinRoadmap(roadmapId: number) {
    if (!activeProjectId) return;
    setPinningId(roadmapId);
    try {
      const res = await fetch(`/api/website-projects/${activeProjectId}/roadmaps/${roadmapId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to unpin roadmap");
        return;
      }
      toast.success("Roadmap removed from project");
      await refreshProjectRoadmaps();
    } catch {
      toast.error("Failed to unpin roadmap");
    } finally {
      setPinningId(null);
    }
  }

  const pinnedIds = new Set(projectRoadmaps.map((r) => r.id));
  const unpinnedCatalog = (catalogRoadmaps as RoadmapSummary[]).filter((r) => !pinnedIds.has(r.id));

  const containerClass = embedded ? "space-y-8" : "px-8 py-8 max-w-5xl space-y-8";

  if (projectLoading && !activeProjectId) {
    return (
      <div className={containerClass}>
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold">Growth Roadmaps</h1>
            <p className="mt-1 text-sm text-muted-foreground">Loading your project context…</p>
          </div>
        ) : null}
        <div className="paper-card p-8 animate-pulse h-64 rounded-xl bg-secondary/40" />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-bold">Growth Roadmaps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeProject
              ? `12-month growth strategies for ${activeProject.name}`
              : "AI-generated B2B growth strategies tied to your projects"}
          </p>
        </div>
      ) : null}

      {!activeProjectId ? (
        <div className="paper-card rounded-xl flex flex-col items-center justify-center p-12 text-center">
          <Map className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No project selected</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create a website project to generate and save roadmaps.
          </p>
          <Link href="/projects">
            <Button>Create project</Button>
          </Link>
        </div>
      ) : (
        <RoadmapGeneratorApp
          projectId={activeProjectId}
          defaultIndustry={defaultIndustry}
          defaultLocation={defaultLocation}
          defaultStage={defaultStage}
          onGenerated={refreshProjectRoadmaps}
        />
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">Your project roadmaps</h2>
        {loadingProject && projectRoadmaps.length === 0 ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : !activeProjectId ? null : projectRoadmaps.length === 0 ? (
          <div className="paper-card rounded-xl flex flex-col items-center justify-center p-12 text-center">
            <Map className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No roadmaps yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate your first roadmap above, or pin one from the catalog below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projectRoadmaps.map((r) => (
              <div key={r.id} className="paper-card p-5 rounded-xl">
                <h3 className="font-semibold text-sm">{r.industry}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {r.location} · {r.stage} stage
                </p>
                <div className="flex items-center justify-between mt-3 gap-2">
                  <Link href={`/growth-roadmaps/${r.slug}`}>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      View <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={pinningId === r.id || fetchingProject}
                    onClick={() => unpinRoadmap(r.id)}
                  >
                    <PinOff className="h-3 w-3 mr-1" />
                    Unpin
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setCatalogOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Browse catalog
          {catalogOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {catalogOpen && (
          <div className="mt-3">
            {loadingCatalog ? (
              <div className="flex justify-center p-8">
                <Spinner />
              </div>
            ) : unpinnedCatalog.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No additional roadmaps in the catalog.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unpinnedCatalog.map((r) => (
                  <div key={r.id} className="paper-card p-5 rounded-xl">
                    <h3 className="font-semibold text-sm">{r.industry}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {r.location} · {r.stage} stage
                    </p>
                    <div className="flex items-center justify-between mt-3 gap-2">
                      <Link href={`/growth-roadmaps/${r.slug}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          Preview <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                      {activeProjectId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={pinningId === r.id}
                          onClick={() => pinRoadmap(r.id)}
                        >
                          <Pin className="h-3 w-3 mr-1" />
                          Pin
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
