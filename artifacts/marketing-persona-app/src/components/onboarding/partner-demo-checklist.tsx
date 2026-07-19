"use client";

import Link from "next/link";
import { FileText, PenLine, Plug, Eye, LayoutDashboard } from "lucide-react";

export type PartnerDemoChecklistProps = {
  projectId: string;
  /** Deep-link target when fast-lane GET returns a piece id. */
  firstPieceId?: number | null;
};

/**
 * Numbered partner walkthrough after fast-lane completes.
 * Vite twin: `artifacts/goals-app-ui/src/components/onboarding/PartnerDemoChecklist.tsx`
 */
export function PartnerDemoChecklist({ projectId, firstPieceId }: PartnerDemoChecklistProps) {
  const articleHref = firstPieceId
    ? `/projects/${projectId}/content-piece/${firstPieceId}`
    : `/projects/${projectId}/content-studio`;
  const humanizeHref = articleHref;
  const connectHref = `/onboarding/connect?projectId=${projectId}`;
  const visibilityHref = "/search/visibility";
  const dashboardHref = "/dashboard";

  const steps = [
    {
      n: 1,
      icon: FileText,
      label: "Review first article",
      hint: firstPieceId ? "Open the draft piece" : "Open content studio",
      href: articleHref,
    },
    {
      n: 2,
      icon: PenLine,
      label: "Humanize before / after",
      hint: "Run Humanize on that piece",
      href: humanizeHref,
    },
    {
      n: 3,
      icon: Plug,
      label: "Connect CMS / publish health",
      hint: "WordPress or other CMS",
      href: connectHref,
    },
    {
      n: 4,
      icon: Eye,
      label: "Check AI visibility",
      hint: "Snapshot scores above",
      href: visibilityHref,
    },
    {
      n: 5,
      icon: LayoutDashboard,
      label: "Open command center",
      hint: "Dashboard outcomes",
      href: dashboardHref,
    },
  ] as const;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Partner demo checklist</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Run these in order — about 15 minutes, no tab hunting.
        </p>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.n}>
              <Link
                href={step.href}
                className="flex items-start gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-left transition-colors hover:bg-secondary/50"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                  {step.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {step.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{step.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
