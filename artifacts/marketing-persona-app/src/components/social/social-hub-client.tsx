"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SocialHubView, parseSocialHubTab } from "@workspace/app-shell/social";
import { APP_SHELL_PAGE_WIDE } from "@workspace/app-shell/shell-constants";
import { useSocialHubClient } from "./use-social-hub-client";

export function SocialHubClient({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const hub = useSocialHubClient(projectId, parseSocialHubTab(searchParams.get("tab")));

  return (
    <div className={`${APP_SHELL_PAGE_WIDE} space-y-5`}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Social Hub</h1>
        <p className="text-sm text-muted-foreground">Queue, schedule, and publish across channels.</p>
      </div>

      <SocialHubView
        projectId={projectId}
        studioHref={`/projects/${projectId}/content-studio`}
        integrationsHref={`/projects/${projectId}/integrations/social`}
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
    </div>
  );
}
