"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";
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
const ProjectStyleTab = dynamic(
  () => import("@/components/projects/project-style-tab").then((m) => m.ProjectStyleTab),
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
const ProjectAutomationPanel = dynamic(
  () =>
    import("@/components/projects/project-automation-panel").then((m) => m.ProjectAutomationPanel),
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

function displayHost(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function ScrapeStatusBadge({ status }: { status: string | null | undefined }) {
  if (status === "pending") {
    return (
      <Badge variant="muted" className="gap-1.5 font-normal">
        <Spinner size="sm" className="h-3 w-3 border-[1.5px]" />
        Scanning
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="font-normal">
        Scan failed
      </Badge>
    );
  }
  if (status === "done") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-700 dark:text-emerald-400"
      >
        Profile ready
      </Badge>
    );
  }
  return null;
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

  function setTab(tab: string) {
    if (!isProjectTab(tab)) return;
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
  const host = displayHost(project.url);
  const pageCount = project.pageCount != null && project.pageCount > 0 ? project.pageCount : null;

  return (
    <div className={`${APP_SHELL_PAGE} space-y-8`}>
      <div className="space-y-5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/projects" className="transition-colors hover:text-foreground">
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          <span className="truncate text-foreground">{project.name}</span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-balance">{project.name}</h1>
              <ScrapeStatusBadge status={project.scrapeStatus} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{host}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              </a>
              {pageCount != null && (
                <>
                  <span className="text-border" aria-hidden>
                    ·
                  </span>
                  <span className="tabular-nums">{pageCount} pages scanned</span>
                </>
              )}
            </div>
          </div>

          <Button asChild className="shrink-0 self-start">
            <Link href={`/projects/${projectId}/content-studio`}>
              <Layers className="mr-2 h-4 w-4" aria-hidden />
              Content Studio
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setTab} className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5">
            Content
            {contentCount > 0 && (
              <Badge variant="muted" className="h-5 min-w-5 justify-center px-1.5 text-xs">
                {contentCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="mt-0">
          <ProjectBrandTab
            projectId={projectId}
            project={project}
            isScraping={isScraping}
            wasAutoFilled={wasAutoFilled}
            scrapeFailed={scrapeFailed}
            onRescan={handleRescrape}
            onProjectUpdate={setProject}
          />
        </TabsContent>

        <TabsContent value="voice" className="mt-0">
          <ProjectVoiceTab
            projectId={projectId}
            isScraping={isScraping}
            wasAutoFilled={wasAutoFilled}
            scrapeFailed={scrapeFailed}
            onRescan={handleRescrape}
          />
        </TabsContent>

        <TabsContent value="style" className="mt-0">
          <ProjectStyleTab
            projectId={projectId}
            project={project}
            isScraping={isScraping}
            onProjectUpdate={setProject}
          />
        </TabsContent>

        <TabsContent value="content" className="mt-0">
          <ProjectContentTab
            projectId={projectId}
            initialContent={(projectContent as ProjectContent | undefined) ?? undefined}
          />
        </TabsContent>

        <TabsContent value="publishing" className="mt-0">
          <Suspense fallback={<TabSkeleton />}>
            <ProjectPublishingTab projectId={projectId} layout="grid" showAutomation={false} />
          </Suspense>
        </TabsContent>

        <TabsContent value="automation" className="mt-0">
          <ProjectAutomationPanel projectId={projectId} />
        </TabsContent>
      </Tabs>

      <section
        aria-labelledby="project-tools-heading"
        className="border-t border-border pt-6"
      >
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="project-tools-heading" className="text-sm font-medium text-foreground">
            Related tools
          </h2>
          <p className="text-xs text-muted-foreground">Jump into workflows for this project</p>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {(
            [
              {
                label: "Integrations",
                description: "CMS, social, email, and search connections",
                href: `/projects/${projectId}/integrations`,
                icon: Layers,
              },
              {
                label: "SEO Articles",
                description: "Draft and refine long-form search content",
                href: `/projects/${projectId}/content-studio#seo`,
                icon: FileText,
              },
              {
                label: "GEO Audit",
                description: "Check answer-engine readiness",
                href: `/audit`,
                icon: Search,
              },
              {
                label: "Analytics",
                description: "Track search performance",
                href: `/search/performance`,
                icon: BarChart3,
              },
            ] as const
          ).map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <item.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
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
      <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground" />
      <h2 className="mb-2 text-xl font-semibold">Project not found</h2>
      <p className="mb-6 text-muted-foreground">
        This project doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Button asChild>
        <Link href="/projects">Back to projects</Link>
      </Button>
    </div>
  );
}
