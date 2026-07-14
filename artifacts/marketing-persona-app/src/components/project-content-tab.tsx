"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, FileText, Map, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ProjectContent } from "@/lib/projects/project-detail-types";

interface Props {
  projectId: string;
  initialContent?: ProjectContent;
}

export function ProjectContentTab({ projectId, initialContent }: Props) {
  const [content, setContent] = useState<ProjectContent | null>(initialContent ?? null);
  const [loading, setLoading] = useState(!initialContent);

  useEffect(() => {
    if (initialContent) return;
    fetch(`/api/website-projects/${projectId}/content`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setContent(data))
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [projectId, initialContent]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!content) {
    return <p className="text-sm text-muted-foreground">Failed to load content inventory.</p>;
  }

  const isEmpty =
    content.contentStrategies.length === 0 &&
    content.seoArticles.length === 0 &&
    content.geoAudits.length === 0 &&
    content.roadmaps.length === 0;

  if (isEmpty) {
    return (
      <div className="paper-card p-12 rounded-xl border-dashed flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No content yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Generate a growth roadmap, then content strategies and articles. Linked content appears
          here automatically.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link href="/strategy/roadmaps">
            <Button>Growth Roadmaps</Button>
          </Link>
          <Link href={`/projects/${projectId}/content-studio`}>
            <Button variant="outline">Content Studio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {content.seoArticles.length > 0 && (
        <div className="paper-card p-6 rounded-xl">
          <h3 className="font-semibold flex items-center gap-2 text-base mb-4">
            <FileText className="w-4 h-4 text-blue-500" />
            SEO Articles
          </h3>
          <div className="divide-y divide-border">
            {content.seoArticles.map((article) => (
              <div key={article.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{article.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {article.primaryKeyword} · {article.wordCount} words
                  </p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/seo-article/${article.id}`}>View</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.contentStrategies.length > 0 && (
        <div className="paper-card p-6 rounded-xl">
          <h3 className="font-semibold flex items-center gap-2 text-base mb-4">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Content Strategies
          </h3>
          <div className="divide-y divide-border">
            {content.contentStrategies.map((strategy) => (
              <div key={strategy.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {strategy.industry} · {strategy.location}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{strategy.stage}</p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/content-strategy/${strategy.id}`}>View</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.geoAudits.length > 0 && (
        <div className="paper-card p-6 rounded-xl">
          <h3 className="font-semibold flex items-center gap-2 text-base mb-4">
            <Search className="w-4 h-4 text-sky-500" />
            GEO Audits
          </h3>
          <div className="divide-y divide-border">
            {content.geoAudits.map((audit) => (
              <div key={audit.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {audit.url.replace(/^https?:\/\//, "")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    GEO Score:{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {audit.geoScore}/100
                    </span>
                  </p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/audit/${audit.id}`}>View</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.roadmaps.length > 0 && (
        <div className="paper-card p-6 rounded-xl">
          <h3 className="font-semibold flex items-center gap-2 text-base mb-4">
            <Map className="w-4 h-4 text-emerald-600" />
            Growth Roadmaps
          </h3>
          <div className="divide-y divide-border">
            {content.roadmaps.map((roadmap) => (
              <div key={roadmap.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {roadmap.industry} · {roadmap.location}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {roadmap.stage} stage
                  </p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/growth-roadmaps/${roadmap.slug}`}>View</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
