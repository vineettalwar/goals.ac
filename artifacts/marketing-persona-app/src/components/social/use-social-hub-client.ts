"use client";

import { useState } from "react";
import type { SocialHubTab } from "@workspace/app-shell/social";
import { useSocialHubQueue } from "./social-hub-queue";
import { useSocialHubComposer } from "./social-hub-composer";
import { useSocialHubMetrics, useSocialHubVoice } from "./social-hub-metrics-voice";

export function useSocialHubClient(projectId: string, initialTab: SocialHubTab = "queue") {
  const [tab, setTab] = useState<SocialHubTab>(initialTab);
  const queue = useSocialHubQueue(projectId);
  const composer = useSocialHubComposer(projectId, tab, queue.loadQueue);
  const metrics = useSocialHubMetrics(projectId, tab);
  const voice = useSocialHubVoice(projectId, tab);

  return {
    tab,
    setTab,
    queue: queue.queue,
    loadingQueue: queue.loadingQueue,
    platformFilter: queue.platformFilter,
    setPlatformFilter: queue.setPlatformFilter,
    loadQueue: queue.loadQueue,
    schedulePiece: queue.schedulePiece,
    submitReview: queue.submitReview,
    approvePiece: queue.approvePiece,
    rejectPiece: queue.rejectPiece,
    reschedulingId: queue.reschedulingId,
    reschedulePiece: queue.reschedulePiece,
    composerParents: composer.composerParents,
    composerParentsLoading: composer.composerParentsLoading,
    composerConnected: composer.composerConnected,
    composing: composer.composing,
    composed: composer.composed,
    compose: composer.compose,
    attachingImage: composer.attachingImage,
    attachFeaturedImageUrl: composer.attachFeaturedImageUrl,
    useStockImage: composer.useStockImage,
    humanizingPieceId: composer.humanizingPieceId,
    humanizeComposedPiece: composer.humanizeComposedPiece,
    metrics: metrics.metrics,
    metricsLoading: metrics.metricsLoading,
    metricsPlatformFilter: metrics.metricsPlatformFilter,
    setMetricsPlatformFilter: metrics.setMetricsPlatformFilter,
    metricsSyncing: metrics.metricsSyncing,
    metricsLastSyncedAt: metrics.metricsLastSyncedAt,
    syncMetrics: metrics.syncMetrics,
    voicePlatform: voice.voicePlatform,
    setVoicePlatform: voice.setVoicePlatform,
    voiceChannel: voice.voiceChannel,
    setVoiceChannel: voice.setVoiceChannel,
    importText: voice.importText,
    setImportText: voice.setImportText,
    voiceLoading: voice.voiceLoading,
    historySync: voice.historySync,
    syncingVoice: voice.syncingVoice,
    channelData: voice.channelData,
    syncVoiceFromOAuth: voice.syncVoiceFromOAuth,
    importVoice: voice.importVoice,
    analyzeVoice: voice.analyzeVoice,
    settings: queue.settings,
    setSettings: queue.setSettings,
    settingsLoading: queue.settingsLoading,
    saveSettings: queue.saveSettings,
  };
}
