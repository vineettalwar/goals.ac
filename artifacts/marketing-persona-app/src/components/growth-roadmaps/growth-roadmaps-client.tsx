"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, ChevronDown, ChevronUp, Map, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProject } from "@/context/active-project";
import { RoadmapGeneratorApp } from "./roadmap-generator-app";

interface RoadmapSummary {
  id: number;
  slug: string;
  industry: string;
  location: string;
  stage: string;
  viewCount?: number;
}

export function GrowthRoadmapsClient() {
  const { activeProjectId, activeProject, isLoading: projectLoading } = useActiveProject();
  const [projectRoadmaps, setProjectRoadmaps] = useState<RoadmapSummary[]>([]);
  const [catalogRoadmaps, setCatalogRoadmaps] = useState<RoadmapSummary[]>([]);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [defaultIndustry, setDefaultIndustry] = useState<string | undefined>();
  const [pinningId, setPinningId] = useState<number | null>(null);

  const loadProjectRoadmaps = useCallback(async () => {
    if (!activeProjectId) {
      setProjectRoadmaps([]);
      return;
    }
    setLoadingProject(true);
    try {
      const res = await fetch(`/api/website-projects/${activeProjectId}/content`);
      if (!res.ok) {
        setProjectRoadmaps([]);
        return;
      }
      const data = await res.json();
      setProjectRoadmaps(data.roadmaps ?? []);
    } catch {
      setProjectRoadmaps([]);
    } finally {
      setLoadingProject(false);
    }
  }, [activeProjectId]);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch("/api/roadmaps?limit=20");
      if (!res.ok) {
        setCatalogRoadmaps([]);
        return;
      }
      const data = await res.json();
      setCatalogRoadmaps(data.roadmaps ?? []);
    } catch {
      setCatalogRoadmaps([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadProjectRoadmaps();
  }, [loadProjectRoadmaps]);

  useEffect(() => {
    if (!activeProjectId) {
      setDefaultIndustry(undefined);
      return;
    }
    fetch(`/api/website-projects/${activeProjectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const industry = data?.brandProfile?.industry;
        if (typeof industry === "string" && industry.trim()) {
          setDefaultIndustry(industry.trim());
        }
      })
      .catch(() => setDefaultIndustry(undefined));
  }, [activeProjectId]);

  useEffect(() => {
    if (catalogOpen && catalogRoadmaps.length === 0) {
      loadCatalog();
    }
  }, [catalogOpen, catalogRoadmaps.length, loadCatalog]);

  async function pinRoadmap(roadmapId: number) {
    if (!activeProjectId) return;
    setPinningId(roadmapId);
    try {
      const res = await fetch(
        `/api/website-projects/${activeProjectId}/roadmaps/${roadmapId}`,
        { method: "POST" },
      );
      if (!res.ok) {
        toast.error("Failed to pin roadmap");
        return;
      }
      toast.success("Roadmap pinned to project");
      await loadProjectRoadmaps();
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
      const res = await fetch(
        `/api/website-projects/${activeProjectId}/roadmaps/${roadmapId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Failed to unpin roadmap");
        return;
      }
      toast.success("Roadmap removed from project");
      await loadProjectRoadmaps();
    } catch {
      toast.error("Failed to unpin roadmap");
    } finally {
      setPinningId(null);
    }
  }

  const pinnedIds = new Set(projectRoadmaps.map((r) => r.id));
  const unpinnedCatalog = catalogRoadmaps.filter((r) => !pinnedIds.has(r.id));

  if (projectLoading) {
    return (
      <div className="flex justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Growth Roadmaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeProject
            ? `12-month growth strategies for ${activeProject.name}`
            : "AI-generated B2B growth strategies tied to your projects"}
        </p>
      </div>

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
          onGenerated={loadProjectRoadmaps}
        />
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">Your project roadmaps</h2>
        {loadingProject ? (
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
                    disabled={pinningId === r.id}
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
