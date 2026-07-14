"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ExternalLink,
  Globe,
  Layers,
  FileText,
  BarChart3,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useProjectContent } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import {
  isProjectTab,
  type ProjectContent,
  type ProjectTab,
  type WebsiteProject,
} from "@/lib/projects/project-detail-types";

const ProjectBrandTab = dynamic(
  () => import("@/components/projects/project-brand-tab").then((m) => m.ProjectBrandTab),
  { loading: () => <TabSkeleton /> },
);
const ProjectVoiceTab = dynamic(
  () => import("@/components/projects/project-voice-tab").then((m) => m.ProjectVoiceTab),
  { loading: () => <TabSkeleton /> },
);
const ProjectContentTab = dynamic(
  () => import("@/components/projects/project-content-tab").then((m) => m.ProjectContentTab),
  { loading: () => <TabSkeleton /> },
);
const ProjectPublishingTab = dynamic(
  () => import("@/components/projects/project-publishing-tab").then((m) => m.ProjectPublishingTab),
  { loading: () => <TabSkeleton /> },
);

function TabSkeleton() {
  return (
    <div className="flex justify-center p-12">
      <Spinner size="lg" />
    </div>
  );
}

async function fetchProject(id: string): Promise<WebsiteProject | null> {
  const res = await fetch(`/api/website-projects/${id}`);
  if (!res.ok) return null;
  return res.json();
}

interface ProjectDetailClientProps {
  projectId: string;
  initialProject: WebsiteProject;
}

function ProjectDetailContent({ projectId, initialProject }: ProjectDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ProjectTab = isProjectTab(tabParam) ? tabParam : "brand";

  const [project, setProject] = useState<WebsiteProject>(initialProject);
  const prevScrapeStatusRef = useRef(project.scrapeStatus);

  const { data: projectContent } = useProjectContent(projectId);
  const scrapePending = project.scrapeStatus === "pending";

  const { data: polledProject } = useQuery({
    queryKey: [...queryKeys.websiteProject(projectId), "scrape-poll"],
    queryFn: () => fetchProject(projectId),
    enabled: scrapePending,
    refetchInterval: scrapePending ? 3000 : false,
  });

  useEffect(() => {
    if (!polledProject) return;

    const prev = prevScrapeStatusRef.current;
    const next = polledProject.scrapeStatus;
    const finishedPending = prev === "pending" && next !== "pending";
    prevScrapeStatusRef.current = next;

    if (finishedPending) {
      if (next === "done") {
        toast.success("Brand profile extracted from your website");
      } else if (next === "failed") {
        toast.error("Website scan failed — fill in fields manually");
      }
    }

    setProject(polledProject);
  }, [polledProject]);

  const contentCount =
    (projectContent?.seoArticles?.length ?? 0) +
    (projectContent?.contentStrategies?.length ?? 0) +
    (projectContent?.geoAudits?.length ?? 0) +
    (projectContent?.roadmaps?.length ?? 0);

  const loadProject = useCallback(async () => {
    const data = await fetchProject(projectId);
    if (data) setProject(data);
    return data;
  }, [projectId]);

  function setTab(tab: ProjectTab) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`/projects/${projectId}?${next.toString()}`);
  }

  async function handleRescrape() {
    setProject((prev) => ({ ...prev, scrapeStatus: "pending" }));
    try {
      const res = await fetch(`/api/website-projects/${projectId}/scrape`, { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to start re-scrape");
        await loadProject();
      }
    } catch {
      toast.error("Failed to start re-scrape");
      await loadProject();
    }
  }

  const isScraping = project.scrapeStatus === "pending";
  const wasAutoFilled = project.scrapeStatus === "done";
  const scrapeFailed = project.scrapeStatus === "failed";

  return (
    <div className="px-8 py-8 max-w-5xl space-y-6">
      <div className="mb-2">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-1"
          >
            <ExternalLink className="w-3 h-3" />
            {project.url.replace(/^https?:\/\//, "")}
          </a>
        </div>
        {project.pageCount != null && project.pageCount > 0 && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Globe className="w-4 h-4" />
            {project.pageCount} pages
          </span>
        )}
      </div>

      <div>
        <Link href={`/projects/${projectId}/content-studio`}>
          <Button size="lg">
            <Layers className="w-4 h-4 mr-2" />
            Open Content Studio
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground mt-2">
          Generate blog posts, guides, whitepapers, and more from your brand profile.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(
          [
            { id: "brand" as const, label: "Brand Profile" },
            { id: "voice" as const, label: "Brand Voice" },
            { id: "content" as const, label: "Your Content" },
            { id: "publishing" as const, label: "Publishing" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === tab.id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.id === "content" && contentCount > 0 && (
              <Badge variant="muted" className="text-xs">
                {contentCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {activeTab === "brand" && (
        <ProjectBrandTab
          projectId={projectId}
          project={project}
          isScraping={isScraping}
          wasAutoFilled={wasAutoFilled}
          scrapeFailed={scrapeFailed}
          onRescan={handleRescrape}
          onProjectUpdate={setProject}
        />
      )}

      {activeTab === "voice" && (
        <ProjectVoiceTab
          projectId={projectId}
          isScraping={isScraping}
          wasAutoFilled={wasAutoFilled}
          scrapeFailed={scrapeFailed}
          onRescan={handleRescrape}
        />
      )}

      {activeTab === "content" && (
        <ProjectContentTab
          projectId={projectId}
          initialContent={(projectContent as ProjectContent | undefined) ?? undefined}
        />
      )}

      {activeTab === "publishing" && (
        <Suspense fallback={<TabSkeleton />}>
          <ProjectPublishingTab projectId={projectId} layout="grid" />
        </Suspense>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {[
          {
            label: "Content Studio",
            href: `/projects/${projectId}/content-studio`,
            icon: <Layers className="h-5 w-5" />,
          },
          {
            label: "SEO Articles",
            href: `/projects/${projectId}/content-studio#seo`,
            icon: <FileText className="h-5 w-5" />,
          },
          { label: "GEO Audit", href: `/audit`, icon: <Search className="h-5 w-5" /> },
          {
            label: "Analytics",
            href: `/search/performance`,
            icon: <BarChart3 className="h-5 w-5" />,
          },
        ].map((item) => (
          <Link key={item.label} href={item.href}>
            <div className="paper-card p-4 flex flex-col items-center gap-2 text-center cursor-pointer hover:bg-muted/40 transition-colors rounded-xl">
              <span className="text-primary">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ProjectDetailClient({ projectId, initialProject }: ProjectDetailClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-16">
          <Spinner size="lg" />
        </div>
      }
    >
      <ProjectDetailContent projectId={projectId} initialProject={initialProject} />
    </Suspense>
  );
}

export function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Project not found</h2>
      <p className="text-muted-foreground mb-6">
        This project doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href="/dashboard">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
