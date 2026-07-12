"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
import { ProjectPublishingTab } from "@/components/project-publishing-tab";
import { ProjectBrandTab } from "@/components/project-brand-tab";
import { ProjectVoiceTab } from "@/components/project-voice-tab";
import { ProjectContentTab } from "@/components/project-content-tab";
import {
  isProjectTab,
  type ProjectTab,
  type WebsiteProject,
} from "@/lib/project-detail-types";

async function fetchProject(id: string): Promise<WebsiteProject | null> {
  const res = await fetch(`/api/website-projects/${id}`);
  if (!res.ok) return null;
  return res.json();
}

function ProjectDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ProjectTab = isProjectTab(tabParam) ? tabParam : "brand";

  const [project, setProject] = useState<WebsiteProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescraping, setRescraping] = useState(false);
  const [contentCount, setContentCount] = useState(0);
  const scrapePollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadProject = useCallback(async () => {
    const data = await fetchProject(params.id);
    setProject(data);
    return data;
  }, [params.id]);

  useEffect(() => {
    loadProject().finally(() => setLoading(false));
  }, [loadProject]);

  useEffect(() => {
    if (activeTab === "content") {
      fetch(`/api/website-projects/${params.id}/content`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          setContentCount(
            (data.seoArticles?.length ?? 0) +
              (data.contentStrategies?.length ?? 0) +
              (data.geoAudits?.length ?? 0) +
              (data.roadmaps?.length ?? 0),
          );
        })
        .catch(() => setContentCount(0));
    }
  }, [activeTab, params.id]);

  useEffect(() => {
    if (!project) return;

    const isPending = project.scrapeStatus === "pending";

    if (isPending && !scrapePollerRef.current) {
      scrapePollerRef.current = setInterval(async () => {
        const updated = await fetchProject(params.id);
        if (!updated) return;
        setProject(updated);
        if (updated.scrapeStatus !== "pending") {
          if (scrapePollerRef.current) {
            clearInterval(scrapePollerRef.current);
            scrapePollerRef.current = null;
          }
          setRescraping(false);
          if (updated.scrapeStatus === "done") {
            toast.success("Brand profile extracted from your website");
          } else if (updated.scrapeStatus === "failed") {
            toast.error("Website scan failed — fill in fields manually");
          }
        }
      }, 3000);
    }

    if (!isPending && scrapePollerRef.current) {
      clearInterval(scrapePollerRef.current);
      scrapePollerRef.current = null;
    }

    return () => {
      if (scrapePollerRef.current) {
        clearInterval(scrapePollerRef.current);
        scrapePollerRef.current = null;
      }
    };
  }, [project?.scrapeStatus, params.id]);

  function setTab(tab: ProjectTab) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`/projects/${params.id}?${next.toString()}`);
  }

  async function handleRescrape() {
    setRescraping(true);
    setProject((prev) => (prev ? { ...prev, scrapeStatus: "pending" } : prev));
    try {
      const res = await fetch(`/api/website-projects/${params.id}/scrape`, { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to start re-scrape");
        setRescraping(false);
        await loadProject();
      }
    } catch {
      toast.error("Failed to start re-scrape");
      setRescraping(false);
      await loadProject();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!project) {
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

  const isScraping = project.scrapeStatus === "pending" || rescraping;
  const wasAutoFilled = project.scrapeStatus === "done";
  const scrapeFailed = project.scrapeStatus === "failed" && !rescraping;
  const confidence = project.scrapeData?.confidence;

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
        <Link href={`/projects/${params.id}/content-studio`}>
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
          projectId={params.id}
          project={project}
          isScraping={isScraping}
          wasAutoFilled={wasAutoFilled}
          scrapeFailed={scrapeFailed}
          confidence={confidence}
          onRescan={handleRescrape}
          rescraping={rescraping}
          onProjectUpdate={setProject}
        />
      )}

      {activeTab === "voice" && (
        <ProjectVoiceTab
          projectId={params.id}
          isScraping={isScraping}
          wasAutoFilled={wasAutoFilled}
          scrapeFailed={scrapeFailed}
          onRescan={handleRescrape}
          rescraping={rescraping}
        />
      )}

      {activeTab === "content" && <ProjectContentTab projectId={params.id} />}

      {activeTab === "publishing" && (
        <Suspense
          fallback={
            <div className="flex justify-center p-12">
              <Spinner size="lg" />
            </div>
          }
        >
          <ProjectPublishingTab projectId={params.id} />
        </Suspense>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {[
          {
            label: "Content Studio",
            href: `/projects/${params.id}/content-studio`,
            icon: <Layers className="h-5 w-5" />,
          },
          {
            label: "SEO Articles",
            href: `/projects/${params.id}/content-studio#seo`,
            icon: <FileText className="h-5 w-5" />,
          },
          { label: "GEO Audit", href: `/geo-audit`, icon: <Search className="h-5 w-5" /> },
          {
            label: "Analytics",
            href: `/keyword-tracking`,
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

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-16">
          <Spinner size="lg" />
        </div>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}
