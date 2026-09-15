"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";
import { useActiveProject } from "@/context/use-active-project";
import {
  useKeywordIntelligence,
  useKeywordSnapshots,
  useTrackedKeywords,
} from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import { ArticleIdeasHub, type SourceFilter } from "@/components/panels/article-ideas-hub";
import { ArticleIdeasImportPanel } from "@/components/panels/article-ideas-import-panel";
import { KeywordAnalyzerTab, KeywordRankTrackingTab, type Analysis } from "@/components/panels/keyword-tracking-tabs";

const RESEARCH_SOURCE_FILTERS = new Set<SourceFilter>([
  "semrush",
  "gsc_query",
  "csv_import",
  "google_sheets",
  "manual",
  "imports",
  "ai_analysis",
  "competitor_gap",
  "rank_drop",
]);

const INNER_TAB =
  "rounded-none border-b-2 border-transparent bg-transparent px-3 pb-2.5 pt-1 shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none";

function isSourceFilter(value: string | null): value is SourceFilter {
  return value != null && RESEARCH_SOURCE_FILTERS.has(value as SourceFilter);
}

export function KeywordTrackingPanel({ embedded = false }: { embedded?: boolean }) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeProjectId, activeProject, isLoading: projectLoading } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const [activeTab, setActiveTab] = useState("ideas");
  const [keywordInput, setKeywordInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [trackInput, setTrackInput] = useState("");
  const [selectedTrackedId, setSelectedTrackedId] = useState<number | null>(null);
  const [ideasSourceFilter, setIdeasSourceFilter] = useState<SourceFilter>("all");

  const { data: tracked = [], isLoading: trackedLoading } = useTrackedKeywords(projectId);
  const {
    alerts,
    isLoading: intelligenceLoading,
    refetch: refetchIntelligence,
  } = useKeywordIntelligence(projectId);
  const { data: snapshots = [] } = useKeywordSnapshots(selectedTrackedId);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "import" || tab === "tracking" || tab === "analyzer" || tab === "ideas") {
      setActiveTab(tab);
    }
    const source = searchParams.get("source");
    if (isSourceFilter(source)) {
      setIdeasSourceFilter(source);
    }
    const keyword = searchParams.get("keyword")?.trim();
    if (keyword) {
      setKeywordInput(keyword);
      setTrackInput(keyword);
      if (!tab) setActiveTab("analyzer");
    }
    if (searchParams.get("sheets") === "connected") {
      toast.success("Google Sheets connected");
    }
    if (searchParams.get("sheets") === "error") {
      toast.error("Google Sheets connection failed");
    }
    if (searchParams.get("sheets") === "forbidden") {
      toast.error("Only site admins can connect Google Sheets for this project");
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeProject?.url) {
      setWebsiteUrl(activeProject.url);
    }
    setAnalysis(null);
    setSelectedTrackedId(null);
    setKeywordInput("");
    setTrackInput("");
  }, [activeProjectId, activeProject?.url]);

  async function handleAnalyze() {
    const keywords = keywordInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywords.length === 0) {
      toast.error("Enter at least one keyword");
      return;
    }

    setLoading(true);
    setAnalysis(null);
    const res = await fetch("/api/keyword-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords,
        websiteUrl: websiteUrl || undefined,
        websiteProjectId: activeProjectId ?? undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Analysis failed");
      return;
    }
    setAnalysis(await res.json());
  }

  async function handleTrackKeyword() {
    if (!projectId || !trackInput.trim()) return;
    const res = await fetch("/api/tracked-keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteProjectId: Number(projectId),
        keyword: trackInput.trim(),
        targetUrl: websiteUrl || undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to track keyword");
      return;
    }
    setTrackInput("");
    await queryClient.invalidateQueries({ queryKey: queryKeys.trackedKeywords(projectId) });
    toast.success("Keyword tracked");
  }

  async function handleDeleteTracked(id: number) {
    await fetch(`/api/tracked-keywords?id=${id}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: queryKeys.trackedKeywords(projectId) });
    if (selectedTrackedId === id) setSelectedTrackedId(null);
  }

  const showInitialLoad =
    projectId && trackedLoading && intelligenceLoading && tracked.length === 0;

  const containerClass = embedded ? "space-y-6" : `${APP_SHELL_PAGE} space-y-6`;

  return (
    <div className={containerClass}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Keyword research</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ideas from Search Console, imports, rank tracking, and analysis
          </p>
        </div>
      ) : null}

      {!projectId ? (
        projectLoading ? (
          <PageSkeleton />
        ) : (
          <div className="paper-card rounded-xl px-5 py-10">
            <p className="font-medium">Choose a project</p>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Keyword research runs against the project selected in the sidebar.
            </p>
            <Button asChild className="mt-4">
              <Link href="/projects">Open projects</Link>
            </Button>
          </div>
        )
      ) : showInitialLoad ? (
        <PageSkeleton />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="ideas" className={INNER_TAB}>
              Ideas
            </TabsTrigger>
            <TabsTrigger value="import" className={INNER_TAB}>
              Import
            </TabsTrigger>
            <TabsTrigger value="tracking" className={INNER_TAB}>
              Ranks
            </TabsTrigger>
            <TabsTrigger value="analyzer" className={INNER_TAB}>
              Analyze
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ideas" className="mt-6 space-y-6">
            <ArticleIdeasHub
              projectId={projectId}
              initialSourceFilter={ideasSourceFilter}
              onRefetch={() => refetchIntelligence()}
            />

            {alerts.length > 0 ? (
              <div>
                <h2 className="text-sm font-medium">Rank movement</h2>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {alerts.map((a) => (
                    <li key={a.id}>
                      <span className="font-medium text-foreground">{a.keyword}</span>
                      {" — "}
                      {a.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <ArticleIdeasImportPanel
              projectId={projectId}
              onImported={() => refetchIntelligence()}
            />
          </TabsContent>

          <TabsContent value="tracking" className="mt-6">
            <KeywordRankTrackingTab
              trackInput={trackInput}
              onTrackInputChange={setTrackInput}
              onTrackKeyword={handleTrackKeyword}
              tracked={tracked}
              selectedTrackedId={selectedTrackedId}
              onSelectTracked={setSelectedTrackedId}
              onDeleteTracked={handleDeleteTracked}
              snapshots={snapshots}
            />
          </TabsContent>

          <TabsContent value="analyzer" className="mt-6 space-y-6">
            <KeywordAnalyzerTab
              keywordInput={keywordInput}
              websiteUrl={websiteUrl}
              loading={loading}
              analysis={analysis}
              onKeywordInputChange={setKeywordInput}
              onWebsiteUrlChange={setWebsiteUrl}
              onAnalyze={handleAnalyze}
              projectId={projectId}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
