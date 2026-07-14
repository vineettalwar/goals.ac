"use client";

import Link from "next/link";
import { Lightbulb, PenLine, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormatBadge } from "@/components/content-studio/content-studio-format-meta";
import {
  contentStudioCreateHref,
  type GeoContentRecommendation,
} from "@/lib/content/geo-audit-content-recommendations";
import { CONTACT_HREF } from "@/lib/marketing/marketing-contact";

type GeoAuditWriteNextProps = {
  recommendations: GeoContentRecommendation[];
  projectId?: number | null;
};

export function GeoAuditWriteNext({ recommendations, projectId }: GeoAuditWriteNextProps) {
  if (recommendations.length === 0) return null;

  const topPick = recommendations[0];

  return (
    <div className="paper-card rounded-2xl p-6 space-y-5 border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Write next</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Content ideas tied to failed checks — create in Content Studio to fix technical gaps
            with publish-ready copy.
          </p>
        </div>
      </div>

      {topPick && (
        <div className="rounded-xl border border-primary/20 bg-background p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Top pick
            </span>
            <FormatBadge type={topPick.formatType} />
            {topPick.priority === "high" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600">
                High impact
              </span>
            )}
          </div>
          <p className="font-medium">{topPick.title}</p>
          <p className="text-sm text-muted-foreground">{topPick.reason}</p>
          <p className="text-xs text-muted-foreground">
            Fixes: <span className="text-foreground">{topPick.relatedCheck}</span>
          </p>
          {projectId ? (
            <Button size="sm" asChild>
              <Link href={contentStudioCreateHref(projectId, topPick)}>
                <PenLine className="h-3.5 w-3.5" />
                Create in Content Studio
              </Link>
            </Button>
          ) : (
            <Button size="sm" asChild variant="outline">
              <Link href={CONTACT_HREF}>
                Contact us to create
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      )}

      {recommendations.length > 1 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            More recommendations
          </p>
          {recommendations.slice(1).map((rec) => (
            <div
              key={rec.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <FormatBadge type={rec.formatType} />
                  <span className="text-xs text-muted-foreground">{rec.relatedCheck}</span>
                </div>
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{rec.reason}</p>
              </div>
              {projectId ? (
                <Button size="sm" variant="outline" className="shrink-0" asChild>
                  <Link href={contentStudioCreateHref(projectId, rec)}>Create</Link>
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
