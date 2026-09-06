import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AutopilotView,
  GrowthRoadmapView,
  HelpView,
  PartnerWorkspaceView,
  SocialHubView,
  parseSocialHubTab,
  projectDetailPath,
} from "@workspace/app-shell";
import { NewProjectButton } from "@/components/NewProjectButton";
import { SectionShell } from "@/components/SectionShell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useAutopilotData } from "@/hooks/use-autopilot-data";
import { useProjectsData } from "@/hooks/use-projects-data";
import {
  useGrowthRoadmap,
  useHelpChecklist,
  usePartnerProjects,
} from "@/hooks/use-section-queries";
import { useSocialData } from "@/hooks/use-social-data";
import { getAppOrigin } from "@/lib/api";
import { renderLink } from "@/pages/section-page-shared";

export function AutopilotPage() {
  const { projectId } = useActiveProject();
  const { settings, loading, error, saveSettings, saving } = useAutopilotData(projectId);

  return (
    <SectionShell title="Autopilot" description="Automated content cadence for the active project.">
      <AutopilotView settings={settings} loading={loading} error={error} onSave={projectId ? saveSettings : undefined} saving={saving} />
    </SectionShell>
  );
}

export function SocialHubPage() {
  const { projectId } = useActiveProject();
  const [searchParams] = useSearchParams();
  const hub = useSocialData(projectId, parseSocialHubTab(searchParams.get("tab")));
  const studioHref = projectId ? `/projects/${projectId}/content-studio` : "/projects";
  const integrationsHref = projectId
    ? `/projects/${projectId}/integrations/social`
    : "/integrations";

  return (
    <SectionShell title="Social hub" description="Schedule and publish social variants.">
      {hub.flash ? (
        <div
          className={
            hub.flash.level === "error"
              ? "mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              : "mb-4 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
          }
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{hub.flash.message}</span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => hub.clearFlash()}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <SocialHubView
        projectId={projectId}
        studioHref={studioHref}
        integrationsHref={integrationsHref}
        pieceHref={(pieceId) =>
          projectId ? `/projects/${projectId}/content-piece/${pieceId}` : `/content-piece/${pieceId}`
        }
        renderLink={renderLink}
        tab={hub.tab}
        onTabChange={hub.setTab}
        queue={hub.queue}
        queueLoading={hub.queueLoading}
        queueError={hub.queueError}
        platformFilter={hub.platformFilter}
        onPlatformFilterChange={hub.setPlatformFilter}
        onRefreshQueue={() => void hub.reloadQueue()}
        onSubmitReview={(id) => void hub.submitReview(id)}
        onApprove={(id) => void hub.approvePiece(id)}
        onReject={(id) => void hub.rejectPiece(id)}
        onSchedule={(id, value) => void hub.schedulePiece(id, value)}
        reschedulingId={hub.reschedulingId}
        onReschedule={(pieceId, dateKey) => void hub.reschedulePiece(pieceId, dateKey)}
        composerParents={hub.composerParents}
        composerParentsLoading={hub.composerParentsLoading}
        composerConnected={hub.composerConnected}
        composing={hub.composing}
        composed={hub.composed}
        onCompose={(parentId, platforms) => void hub.compose(parentId, platforms)}
        attachingImage={hub.attachingImage}
        onAttachFeaturedImageUrl={(parentId, url) => void hub.attachFeaturedImageUrl(parentId, url)}
        onUseStockImage={(parentId) => void hub.useStockImage(parentId)}
        onHumanize={(pieceId) => void hub.humanizeComposedPiece(pieceId)}
        humanizingPieceId={hub.humanizingPieceId}
        metrics={hub.metrics}
        metricsLoading={hub.metricsLoading}
        metricsPlatformFilter={hub.metricsPlatformFilter}
        onMetricsPlatformFilterChange={hub.setMetricsPlatformFilter}
        metricsSyncing={hub.metricsSyncing}
        metricsLastSyncedAt={hub.metricsLastSyncedAt}
        onSyncMetrics={() => void hub.syncMetrics()}
        voicePlatform={hub.voicePlatform}
        voiceChannel={hub.voiceChannel}
        importText={hub.importText}
        voiceLoading={hub.voiceLoading}
        historySync={hub.historySync}
        syncingVoice={hub.syncingVoice}
        channelData={hub.channelData}
        onVoicePlatformChange={hub.setVoicePlatform}
        onVoiceChannelChange={hub.setVoiceChannel}
        onImportTextChange={hub.setImportText}
        onSyncVoiceFromOAuth={() => void hub.syncVoiceFromOAuth()}
        onImportVoice={() => void hub.importVoice()}
        onAnalyzeVoice={() => void hub.analyzeVoice()}
        settings={hub.settings}
        settingsLoading={hub.settingsLoading}
        onSettingsChange={hub.setSettings}
        onSaveSettings={() => void hub.saveSettings()}
      />
    </SectionShell>
  );
}

export function PartnerPage() {
  const { organizationName, user, loading: authLoading } = useAuth();
  const { projects, loading, error } = usePartnerProjects();

  return (
    <SectionShell title="Partner portal" description="Agency billing and client workspaces." requireProject={false}>
      {authLoading && !user ? (
        <p className="text-sm text-muted-foreground">Loading organization…</p>
      ) : error ? (
        <PartnerWorkspaceView projects={[]} organizationName={organizationName} renderLink={renderLink} />
      ) : (
        <PartnerWorkspaceView projects={projects} organizationName={organizationName} renderLink={renderLink} />
      )}
      {loading ? <p className="mt-2 text-xs text-muted-foreground">Refreshing metrics…</p> : null}
    </SectionShell>
  );
}

export function HelpPage() {
  const { projects, projectId } = useActiveProject();
  const hasProject = projects.length > 0;
  const { hasCmsIntegration, hasContentPiece, loading: checklistLoading } = useHelpChecklist(projectId);

  return (
    <SectionShell title="Help" description="Product docs and setup guides." requireProject={false}>
      <HelpView
        advancedAppHref={getAppOrigin()}
        resourceLinks={[
          { label: "Help center on goals.ac", href: "https://goals.ac/help", description: "Guides, FAQs, and documentation." },
          { label: "Integrations setup", href: "https://goals.ac/help/integrations", description: "Connect CMS platforms." },
        ]}
        checklist={[
          { id: "project", label: "Create a website project", done: hasProject, href: "/projects" },
          { id: "brand", label: "Complete brand profile", done: false, href: projectId ? `/projects/${projectId}` : "/projects" },
          { id: "integrations", label: "Connect a CMS integration", done: !checklistLoading && hasCmsIntegration, href: projectId ? `/projects/${projectId}/integrations` : "/projects" },
          { id: "content", label: "Generate your first content piece", done: !checklistLoading && hasContentPiece, href: projectId ? `/projects/${projectId}/content-studio` : "/projects" },
        ]}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { loading, projects } = useProjectsData();

  if (loading && projects.length === 0) {
    return (
      <SectionShell title="Onboarding" description="Set up your first project." requireProject={false}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </SectionShell>
    );
  }

  if (projects.length === 0) {
    return (
      <SectionShell title="Onboarding" description="Set up your first project and brand profile." requireProject={false}>
        <div className="paper-card max-w-lg space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            Create your first project to analyze your site and build your brand profile.
          </p>
          <NewProjectButton
            onCreated={(project) => {
              navigate(projectDetailPath(project.id));
            }}
          />
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell title="Onboarding" description="Set up your first project." requireProject={false}>
      <p className="text-sm text-muted-foreground">
        You already have projects. Visit{" "}
        <Link to="/projects" className="font-medium text-primary hover:underline">
          Projects
        </Link>{" "}
        to manage them.
      </p>
    </SectionShell>
  );
}

export function GrowthRoadmapPage({ slug }: { slug: string }) {
  const { roadmap, loading, error } = useGrowthRoadmap(slug);

  return (
    <div className="max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <GrowthRoadmapView roadmap={roadmap} slug={slug} loading={loading} error={error} renderLink={renderLink} />
    </div>
  );
}
