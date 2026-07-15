"use client";

import Link from "next/link";
import { SocialHubView } from "@workspace/app-shell";
import { useSocialHubClient } from "./use-social-hub-client";

export function SocialHubClient({ projectId }: { projectId: string }) {
  const hub = useSocialHubClient(projectId);

  return (
    <div className="max-w-6xl space-y-6 px-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Social Hub</h1>
        <p className="text-sm text-muted-foreground">
          Train platform voice, queue posts, and schedule publishing across social channels.
        </p>
      </div>

      <SocialHubView
        projectId={projectId}
        studioHref={`/projects/${projectId}/content-studio`}
        integrationsHref={`/projects/${projectId}/integrations`}
        pieceHref={(pieceId) => `/projects/${projectId}/content-piece/${pieceId}`}
        renderLink={({ href, className, children }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
        tab={hub.tab}
        onTabChange={hub.setTab}
        queue={hub.queue}
        queueLoading={hub.loadingQueue}
        queueError={null}
        platformFilter={hub.platformFilter}
        onPlatformFilterChange={hub.setPlatformFilter}
        onRefreshQueue={() => void hub.loadQueue()}
        onSubmitReview={(id) => void hub.submitReview(id)}
        onApprove={(id) => void hub.approvePiece(id)}
        onSchedule={(id, value) => void hub.schedulePiece(id, value)}
        reschedulingId={hub.reschedulingId}
        onReschedule={(pieceId, dateKey) => void hub.reschedulePiece(pieceId, dateKey)}
        composerParents={hub.composerParents}
        composerParentsLoading={hub.composerParentsLoading}
        composerConnected={hub.composerConnected}
        composing={hub.composing}
        composed={hub.composed}
        onCompose={(parentId, platforms) => void hub.compose(parentId, platforms)}
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
    </div>
  );
}
