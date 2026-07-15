"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DashboardView,
  type DashboardArticleUsage,
  type DashboardAutopilotSavePayload,
  type DashboardAutopilotSettings,
  type DashboardCommandCenter,
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
  commandCenter: DashboardCommandCenter | null;
  articleUsage: DashboardArticleUsage | null;
};

export function DashboardPageClient({
  greeting,
  subtitle,
  projects,
  activeProject,
  pieces,
  autopilotSettings,
  commandCenter,
  articleUsage,
}: DashboardPageClientProps) {
  const activeProjectId = activeProject?.id ?? null;
  const [settings, setSettings] = useState<DashboardAutopilotSettings | null>(autopilotSettings);
  const [savingAutopilot, setSavingAutopilot] = useState(false);
  const [saveAutopilotError, setSaveAutopilotError] = useState<string | null>(null);

  useEffect(() => {
    setSettings(autopilotSettings);
  }, [autopilotSettings, activeProjectId]);

  const onSaveAutopilot = useCallback(
    async (payload: DashboardAutopilotSavePayload) => {
      if (!activeProjectId) return;
      setSavingAutopilot(true);
      setSaveAutopilotError(null);
      try {
        const res = await fetch(`/api/website-projects/${activeProjectId}/autopilot-settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Failed to save autopilot settings");
        }
        const updated = (await res.json()) as DashboardAutopilotSettings;
        setSettings(updated);
      } catch (err) {
        setSaveAutopilotError(
          err instanceof Error ? err.message : "Failed to save autopilot settings",
        );
      } finally {
        setSavingAutopilot(false);
      }
    },
    [activeProjectId],
  );

  return (
    <DashboardView
      greeting={greeting}
      subtitle={subtitle}
      projectCount={activeProjectId ? 1 : projects.length}
      scopedToActiveProject={Boolean(activeProjectId)}
      activeProject={activeProject}
      activeProjectId={activeProjectId}
      pieces={pieces}
      autopilotSettings={settings}
      commandCenter={commandCenter}
      articleUsage={articleUsage}
      onSaveAutopilot={activeProjectId ? onSaveAutopilot : undefined}
      savingAutopilot={savingAutopilot}
      saveAutopilotError={saveAutopilotError}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
