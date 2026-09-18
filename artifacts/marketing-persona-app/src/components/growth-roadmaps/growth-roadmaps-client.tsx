"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ChevronDown, ChevronUp, Map, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";
import { useActiveProject } from "@/context/use-active-project";
import { useBrandProfile, useProjectRoadmaps, useRoadmapsCatalog } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import { clearRoadmapIntent, readRoadmapIntent, type RoadmapIntent } from "@/lib/projects/roadmap-intent";
import { RoadmapGeneratorApp } from "./roadmap-generator-app";

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
    data: projectRoadmaps = [],
    isLoading: loadingProject,
    isFetching: fetchingProject,
  } = useProjectRoadmaps(activeProjectId);
  const { data: brandProfile } = useBrandProfile(
    activeProjectId != null ? String(activeProjectId) : "",
  );
  const { data: catalogRoadmaps = [], isLoading: loadingCatalog } = useRoadmapsCatalog(catalogOpen);

  useEffect(() => {
    const intent = readRoadmapIntent();
    if (intent) {
      setStoredIntent(intent);
      clearRoadmapIntent();
      void refreshProjects();
    }
  }, [refreshProjects]);

  const signupIndustry =
    searchParams.get("industry")?.trim() || storedIntent?.industry?.trim() || undefined;
  const signupLocation =
    searchParams.get("location")?.trim() || storedIntent?.location?.trim() || undefined;
  const signupStage =
    searchParams.get("stage")?.trim() || storedIntent?.stage?.trim() || undefined;
  const defaultIndustry = useMemo(() => {
    if (signupIndustry) return signupIndustry;
    if (typeof brandProfile?.industry === "string" && brandProfile.industry.trim()) {
      return brandProfile.industry.trim();
    }
    return undefined;
  }, [signupIndustry, brandProfile]);
  const defaultLocation = signupLocation;
  const defaultStage = signupStage;

  async function refreshProjectRoadmaps() {
    if (!activeProjectId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectRoadmaps(activeProjectId) });
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

  const pinnedIds = new Set((projectRoadmaps as RoadmapSummary[]).map((r) => r.id));
  const unpinnedCatalog = (catalogRoadmaps as RoadmapSummary[]).filter((r) => !pinnedIds.has(r.id));

  const containerClass = embedded ? "space-y-6" : `${APP_SHELL_PAGE} space-y-6`;

  if (projectLoading && !activeProjectId) {
    return (
      <div className={containerClass}>
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold">Growth Roadmaps</h1>
            <p className="mt-1 text-sm text-muted-foreground">Loading your project context…</p>
          </div>
        ) : null}
        <div className="space-y-4">
          <div className="paper-card rounded-xl p-8 animate-pulse h-48 bg-secondary/40" />
          <div className="space-y-3">
            <div className="paper-card rounded-xl p-6 animate-pulse h-12 bg-secondary/40" />
            <div className="paper-card rounded-xl p-6 animate-pulse h-12 bg-secondary/40" />
          </div>
        </div>
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
              : "B2B growth strategies tied to your projects"}
          </p>
        </div>
      ) : null}

      {!activeProjectId ? (
        <div className="paper-card rounded-xl p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Map className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Select a project to get started</h3>
          <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
            Choose a website project to generate and save 12-month growth roadmaps, or create a new project.
          </p>
          <div className="mt-6">
            <Link href="/projects">
              <Button>Create project</Button>
            </Link>
          </div>
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your roadmaps</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and view pinned 12-month growth strategies
            </p>
          </div>
          {projectRoadmaps.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
              {projectRoadmaps.length} pinned
            </span>
          )}
        </div>
        {loadingProject && projectRoadmaps.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="paper-card rounded-xl p-5 animate-pulse h-48 bg-secondary/40" />
            ))}
          </div>
        ) : !activeProjectId ? null : projectRoadmaps.length === 0 ? (
          <div className="paper-card rounded-xl p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Map className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No roadmaps yet</h3>
            <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
              Generate your first 12-month growth roadmap above, or browse the catalog to pin one to this project.
            </p>
            <div className="mt-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                Browse catalog below to get started
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(projectRoadmaps as RoadmapSummary[]).map((r) => (
              <div key={r.id} className="paper-card rounded-xl p-5 transition-all hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base">{r.industry}</h3>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {r.location} · {r.stage} stage
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link href={`/growth-roadmaps/${r.slug}`}>
                    <Button variant="default" size="sm" className="h-8 px-3 text-sm">
                      View Roadmap <ArrowRight className="h-3 w-3 ml-1.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={pinningId === r.id || fetchingProject}
                    onClick={() => unpinRoadmap(r.id)}
                  >
                    <PinOff className="h-3 w-3 mr-1.5" />
                    Unpin
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setCatalogOpen((o) => !o)}
          className="flex items-center justify-between w-full p-4 paper-card rounded-xl hover:shadow-md transition-all text-left"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Map className="h-4 w-4" />
              Browse roadmap catalog
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {catalogOpen ? "Hide catalog" : `View ${unpinnedCatalog.length} available roadmaps`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${catalogOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {catalogOpen && (
          <div className="space-y-4">
            {loadingCatalog ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="paper-card rounded-xl p-5 animate-pulse h-56 bg-secondary/40" />
                ))}
              </div>
            ) : unpinnedCatalog.length === 0 ? (
              <div className="paper-card rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">No additional roadmaps available in the catalog.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Available {unpinnedCatalog.length} roadmaps
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unpinnedCatalog.map((r) => (
                    <div key={r.id} className="paper-card rounded-xl p-5 transition-all hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-base">{r.industry}</h3>
                          <p className="text-xs text-muted-foreground mt-1 capitalize">
                            {r.location} · {r.stage} stage
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <Link href={`/growth-roadmaps/${r.slug}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-sm px-3">
                            Preview <ArrowRight className="h-3 w-3 ml-1.5" />
                          </Button>
                        </Link>
                        {activeProjectId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={pinningId === r.id}
                            onClick={() => pinRoadmap(r.id)}
                          >
                            <Pin className="h-3 w-3 mr-1.5" />
                            Pin
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
