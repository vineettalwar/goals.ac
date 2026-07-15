"use client";

import Link from "next/link";
import {
  DashboardView,
  type DashboardAutopilotSettings,
  type DashboardPiece,
  type DashboardProject,
} from "@workspace/app-shell";

export type DashboardPageClientProps = {
  greeting: string;
  subtitle: string | null;
  projects: DashboardProject[];
  activeProject: DashboardProject | null;
  pieces: DashboardPiece[];
  autopilotSettings: DashboardAutopilotSettings | null;
};

export function DashboardPageClient({
  greeting,
  subtitle,
  projects,
  activeProject,
  pieces,
  autopilotSettings,
}: DashboardPageClientProps) {
  const activeProjectId = activeProject?.id ?? null;

  return (
    <DashboardView
      greeting={greeting}
      subtitle={subtitle}
      projectCount={activeProjectId ? 1 : projects.length}
      scopedToActiveProject={Boolean(activeProjectId)}
      activeProject={activeProject}
      activeProjectId={activeProjectId}
      pieces={pieces}
      autopilotSettings={autopilotSettings}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
