import { lazy, Suspense, useState, type ReactNode } from "react";
import {
  BarChart3,
  Calendar,
  Clock,
  Mic2,
  PenLine,
  Settings2,
} from "lucide-react";
import { SectionTabs } from "../section-panels/shared";
import type { SocialHubLinkProps } from "./social-queue-panel";
import type {
  HistorySyncPlatformStatus,
  PlatformVoiceProfile,
  ScheduleSettings,
  SocialComposedPiece,
  SocialComposerParent,
  SocialHubTab,
  SocialMetricsResponse,
  SocialPlatformId,
  SocialQueueItem,
} from "./types";

export type { SocialHubLinkProps };

const SocialQueuePanel = lazy(() =>
  import("./social-queue-panel").then((m) => ({ default: m.SocialQueuePanel })),
);
const SocialCalendarPanel = lazy(() =>
  import("./social-calendar-panel").then((m) => ({ default: m.SocialCalendarPanel })),
);
const SocialComposerPanel = lazy(() =>
  import("./social-composer-panel").then((m) => ({ default: m.SocialComposerPanel })),
);
const SocialAnalyticsPanel = lazy(() =>
  import("./social-analytics-panel").then((m) => ({ default: m.SocialAnalyticsPanel })),
);
const SocialVoicePanel = lazy(() =>
  import("./social-voice-panel").then((m) => ({ default: m.SocialVoicePanel })),
);
const SocialSettingsPanel = lazy(() =>
  import("./social-settings-panel").then((m) => ({ default: m.SocialSettingsPanel })),
);

function TabFallback() {
  return <div className="h-40 animate-pulse rounded-xl bg-secondary/60" aria-hidden />;
}

const TABS = [
  { id: "queue", label: "Queue", icon: <Clock className="h-3.5 w-3.5" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: "compose", label: "Compose", icon: <PenLine className="h-3.5 w-3.5" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "voice", label: "Voice", icon: <Mic2 className="h-3.5 w-3.5" /> },
  { id: "settings", label: "Settings", icon: <Settings2 className="h-3.5 w-3.5" /> },
];

export function SocialHubView({
  projectId,
  studioHref,
  integrationsHref,
  pieceHref,
  renderLink,
  tab,
  onTabChange,
  queue,
  queueLoading,
  queueError,
  platformFilter,
  onPlatformFilterChange,
  onRefreshQueue,
  onSubmitReview,
  onApprove,
  onReject,
  onSchedule,
  reschedulingId,
  onReschedule,
  composerParents,
  composerParentsLoading,
  composerConnected,
  composing,
  composed,
  onCompose,
  attachingImage,
  onAttachFeaturedImageUrl,
  onUseStockImage,
  onHumanize,
  humanizingPieceId,
  metrics,
  metricsLoading,
  metricsPlatformFilter,
  onMetricsPlatformFilterChange,
  metricsSyncing,
  metricsLastSyncedAt,
  onSyncMetrics,
  voicePlatform,
  voiceChannel,
  importText,
  voiceLoading,
  historySync,
  syncingVoice,
  channelData,
  onVoicePlatformChange,
  onVoiceChannelChange,
  onImportTextChange,
  onSyncVoiceFromOAuth,
  onImportVoice,
  onAnalyzeVoice,
  settings,
  settingsLoading,
  onSettingsChange,
  onSaveSettings,
}: {
  projectId?: string | null;
  studioHref: string;
  integrationsHref: string;
  pieceHref: (pieceId: number) => string;
  renderLink: (props: SocialHubLinkProps) => ReactNode;
  tab: SocialHubTab;
  onTabChange: (tab: SocialHubTab) => void;
  queue: SocialQueueItem[];
  queueLoading: boolean;
  queueError: string | null;
  platformFilter: string;
  onPlatformFilterChange: (value: string) => void;
  onRefreshQueue: () => void;
  onSubmitReview: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSchedule: (id: number, value: string) => void;
  reschedulingId: number | null;
  onReschedule: (pieceId: number, newDateKey: string | null) => void;
  composerParents: SocialComposerParent[];
  composerParentsLoading: boolean;
  composerConnected: Record<string, boolean>;
  composing: boolean;
  composed: SocialComposedPiece[] | null;
  onCompose: (parentPieceId: number, platforms: SocialPlatformId[]) => void;
  attachingImage?: boolean;
  onAttachFeaturedImageUrl?: (parentPieceId: number, url: string) => void | Promise<void>;
  onUseStockImage?: (parentPieceId: number) => void | Promise<void>;
  onHumanize?: (pieceId: number) => void | Promise<void>;
  humanizingPieceId?: number | null;
  metrics: SocialMetricsResponse | null;
  metricsLoading: boolean;
  metricsPlatformFilter: string;
  onMetricsPlatformFilterChange: (value: string) => void;
  metricsSyncing: boolean;
  metricsLastSyncedAt: string | null;
  onSyncMetrics: () => void;
  voicePlatform: SocialPlatformId;
  voiceChannel: string;
  importText: string;
  voiceLoading: boolean;
  historySync: Partial<Record<SocialPlatformId, HistorySyncPlatformStatus>>;
  syncingVoice: boolean;
  channelData: PlatformVoiceProfile["channels"][string] | undefined;
  onVoicePlatformChange: (value: SocialPlatformId) => void;
  onVoiceChannelChange: (value: string) => void;
  onImportTextChange: (value: string) => void;
  onSyncVoiceFromOAuth: () => void;
  onImportVoice: () => void;
  onAnalyzeVoice: () => void;
  settings: ScheduleSettings | null;
  settingsLoading: boolean;
  onSettingsChange: (settings: ScheduleSettings) => void;
  onSaveSettings: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTabs
          tabs={TABS}
          active={tab}
          onChange={(id) => onTabChange(id as SocialHubTab)}
        />
        {projectId
          ? renderLink({
              href: studioHref,
              className:
                "inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm hover:bg-secondary",
              children: "Content Studio",
            })
          : null}
      </div>

      <Suspense fallback={<TabFallback />}>
        {tab === "queue" ? (
          <SocialQueuePanel
            platformFilter={platformFilter}
            onPlatformFilterChange={onPlatformFilterChange}
            loadingQueue={queueLoading}
            queue={queue}
            queueError={queueError}
            pieceHref={pieceHref}
            renderLink={renderLink}
            onRefresh={onRefreshQueue}
            onSubmitReview={onSubmitReview}
            onApprove={onApprove}
            onReject={onReject}
            onSchedule={onSchedule}
            requireApproval={Object.values(settings?.platforms ?? {}).some(
              (platform) => platform?.requireApproval === true,
            )}
            attachingImage={attachingImage}
            onUseStockImage={onUseStockImage}
          />
        ) : null}

        {tab === "calendar" ? (
          <SocialCalendarPanel
            items={(queue ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              platform: item.platform,
              scheduledAt: item.scheduledAt,
              bodyMarkdown: item.bodyMarkdown,
              formatType: item.formatType,
            }))}
            loading={queueLoading}
            reschedulingId={reschedulingId}
            pieceHref={pieceHref}
            renderLink={renderLink}
            onReschedule={onReschedule}
          />
        ) : null}

        {tab === "compose" ? (
          <SocialComposerPanel
            parents={composerParents}
            parentsLoading={composerParentsLoading}
            connected={composerConnected}
            composing={composing}
            composed={composed}
            pieceHref={pieceHref}
            integrationsHref={integrationsHref}
            renderLink={renderLink}
            onCompose={onCompose}
            attachingImage={attachingImage}
            onAttachFeaturedImageUrl={onAttachFeaturedImageUrl}
            onUseStockImage={onUseStockImage}
            onHumanize={onHumanize}
            humanizingPieceId={humanizingPieceId}
          />
        ) : null}

        {tab === "analytics" ? (
          <SocialAnalyticsPanel
            metrics={metrics}
            metricsLoading={metricsLoading}
            metricsPlatformFilter={metricsPlatformFilter}
            onMetricsPlatformFilterChange={onMetricsPlatformFilterChange}
            syncing={metricsSyncing}
            lastSyncedAt={metricsLastSyncedAt}
            pieceHref={pieceHref}
            integrationsHref={integrationsHref}
            settingsHref={integrationsHref}
            renderLink={renderLink}
            onSync={onSyncMetrics}
            onSyncMetrics={onSyncMetrics}
          />
        ) : null}

        {tab === "voice" ? (
          <SocialVoicePanel
            voicePlatform={voicePlatform}
            voiceChannel={voiceChannel}
            importText={importText}
            voiceLoading={voiceLoading}
            historySync={historySync}
            syncingVoice={syncingVoice}
            channelData={channelData}
            onVoicePlatformChange={onVoicePlatformChange}
            onVoiceChannelChange={onVoiceChannelChange}
            onImportTextChange={onImportTextChange}
            onSyncVoiceFromOAuth={onSyncVoiceFromOAuth}
            onImportVoice={onImportVoice}
            onAnalyzeVoice={onAnalyzeVoice}
          />
        ) : null}

        {tab === "settings" ? (
          <SocialSettingsPanel
            settings={settings}
            settingsLoading={settingsLoading}
            onSettingsChange={onSettingsChange}
            onSaveSettings={onSaveSettings}
          />
        ) : null}
      </Suspense>
    </div>
  );
}

/** Self-contained tab state helper for hosts that don't own tab UI state. */
export function useSocialHubTab(initial: SocialHubTab = "queue") {
  return useState<SocialHubTab>(initial);
}
