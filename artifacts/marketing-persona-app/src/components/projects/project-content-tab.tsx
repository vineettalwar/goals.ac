"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3, FileText, Map, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useProjectContent } from "@/lib/queries";
import type { ProjectContent } from "@/lib/projects/project-detail-types";

interface Props {
  projectId: string;
  initialContent?: ProjectContent;
}

function ContentSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="paper-card overflow-hidden rounded-xl">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function ContentRow({
  title,
  meta,
  href,
}: {
  title: string;
  meta: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
      </div>
      <Button size="sm" variant="ghost" asChild className="shrink-0">
        <Link href={href}>View</Link>
      </Button>
    </div>
  );
}

export function ProjectContentTab({ projectId, initialContent }: Props) {
  const { data, isLoading } = useProjectContent(initialContent ? null : projectId);
  const content = initialContent ?? (data as ProjectContent | undefined) ?? null;
  const loading = !initialContent && isLoading;

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="paper-card rounded-xl p-6">
        <p className="text-sm text-muted-foreground">Failed to load content inventory.</p>
      </div>
    );
  }

  const isEmpty =
    content.contentStrategies.length === 0 &&
    content.seoArticles.length === 0 &&
    content.geoAudits.length === 0 &&
    content.roadmaps.length === 0;

  if (isEmpty) {
    return (
      <div className="py-12">
        <h3 className="text-base font-semibold">No content yet</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Generate a growth roadmap, then content strategies and articles. Linked content appears
          here automatically.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/strategy/roadmaps">Growth Roadmaps</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/content-studio`}>Content Studio</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {content.seoArticles.length > 0 && (
        <ContentSection title="SEO Articles" icon={<FileText className="h-4 w-4" aria-hidden />}>
          {content.seoArticles.map((article) => (
            <ContentRow
              key={article.id}
              title={article.title}
              meta={`${article.primaryKeyword} · ${article.wordCount} words`}
              href={`/seo-article/${article.id}`}
            />
          ))}
        </ContentSection>
      )}

      {content.contentStrategies.length > 0 && (
        <ContentSection
          title="Content Strategies"
          icon={<BarChart3 className="h-4 w-4" aria-hidden />}
        >
          {content.contentStrategies.map((strategy) => (
            <ContentRow
              key={strategy.id}
              title={`${strategy.industry} · ${strategy.location}`}
              meta={strategy.stage}
              href={`/content-strategy/${strategy.id}`}
            />
          ))}
        </ContentSection>
      )}

      {content.geoAudits.length > 0 && (
        <ContentSection title="GEO Audits" icon={<Search className="h-4 w-4" aria-hidden />}>
          {content.geoAudits.map((audit) => (
            <ContentRow
              key={audit.id}
              title={audit.url.replace(/^https?:\/\//, "")}
              meta={`GEO Score: ${audit.geoScore}/100`}
              href={`/audit/${audit.id}`}
            />
          ))}
        </ContentSection>
      )}

      {content.roadmaps.length > 0 && (
        <ContentSection title="Growth Roadmaps" icon={<Map className="h-4 w-4" aria-hidden />}>
          {content.roadmaps.map((roadmap) => (
            <ContentRow
              key={roadmap.id}
              title={`${roadmap.industry} · ${roadmap.location}`}
              meta={`${roadmap.stage} stage`}
              href={`/growth-roadmaps/${roadmap.slug}`}
            />
          ))}
        </ContentSection>
      )}
    </div>
  );
}
