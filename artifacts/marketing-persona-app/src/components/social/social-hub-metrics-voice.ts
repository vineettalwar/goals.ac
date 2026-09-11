"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  HistorySyncPlatformStatus,
  PlatformVoiceProfile,
  SocialHubTab,
  SocialMetricsResponse,
  SocialPlatformId,
} from "@workspace/app-shell/social";

export function useSocialHubMetrics(projectId: string, tab: SocialHubTab) {
  const [metrics, setMetrics] = useState<SocialMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsPlatformFilter, setMetricsPlatformFilter] = useState("all");
  const [metricsSyncing, setMetricsSyncing] = useState(false);
  const [metricsLastSyncedAt, setMetricsLastSyncedAt] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const qs =
        metricsPlatformFilter !== "all"
          ? `?platform=${encodeURIComponent(metricsPlatformFilter)}`
          : "";
      const res = await fetch(`/api/website-projects/${projectId}/social/metrics${qs}`);
      if (!res.ok) throw new Error("Failed to load metrics");
      setMetrics((await res.json()) as SocialMetricsResponse);
    } catch {
      toast.error("Could not load social analytics");
    } finally {
      setMetricsLoading(false);
    }
  }, [projectId, metricsPlatformFilter]);

  const loadMetricsStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/metrics/sync`);
      if (!res.ok) return;
      const status = (await res.json()) as { lastSyncedAt?: string | null };
      setMetricsLastSyncedAt(status.lastSyncedAt ?? null);
    } catch {
      /* optional */
    }
  }, [projectId]);

  useEffect(() => {
    if (tab === "analytics") {
      void loadMetrics();
      void loadMetricsStatus();
    }
  }, [tab, loadMetrics, loadMetricsStatus]);

  async function syncMetrics() {
    setMetricsSyncing(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/metrics/sync`, {
        method: "POST",
      });
      const body = (await res.json()) as { error?: string; rowsUpserted?: number };
      if (!res.ok) throw new Error(body.error ?? "Sync failed");
      toast.success(`Synced ${body.rowsUpserted ?? 0} posts`);
      await loadMetricsStatus();
      await loadMetrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setMetricsSyncing(false);
    }
  }

  return {
    metrics,
    metricsLoading,
    metricsPlatformFilter,
    setMetricsPlatformFilter,
    metricsSyncing,
    metricsLastSyncedAt,
    syncMetrics,
  };
}

export function useSocialHubVoice(projectId: string, tab: SocialHubTab) {
  const [voicePlatform, setVoicePlatform] = useState<SocialPlatformId>("linkedin");
  const [voiceChannel, setVoiceChannel] = useState("posts");
  const [importText, setImportText] = useState("");
  const [voiceProfile, setVoiceProfile] = useState<PlatformVoiceProfile | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [historySync, setHistorySync] = useState<
    Partial<Record<SocialPlatformId, HistorySyncPlatformStatus>>
  >({});
  const [syncingVoice, setSyncingVoice] = useState(false);

  const loadVoice = useCallback(async () => {
    setVoiceLoading(true);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/brand-profile/platform-voice/${voicePlatform}`,
      );
      if (!res.ok) throw new Error("Failed to load voice");
      const data = (await res.json()) as {
        profile: PlatformVoiceProfile;
        channels: string[];
      };
      setVoiceProfile(data.profile);
      if (data.channels?.[0]) setVoiceChannel(data.channels[0]);
    } catch {
      toast.error("Could not load platform voice");
    } finally {
      setVoiceLoading(false);
    }
  }, [projectId, voicePlatform]);

  const loadHistorySync = useCallback(async () => {
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/history-sync`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        platforms: Partial<Record<SocialPlatformId, HistorySyncPlatformStatus>>;
      };
      setHistorySync(data.platforms ?? {});
    } catch {
      /* optional */
    }
  }, [projectId]);

  useEffect(() => {
    if (tab === "voice") {
      void loadVoice();
      void loadHistorySync();
    }
  }, [tab, loadVoice, loadHistorySync]);

  async function syncVoiceFromOAuth() {
    setSyncingVoice(true);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/social/history-sync?platform=${voicePlatform}`,
        { method: "POST" },
      );
      const data = (await res.json()) as {
        results?: Array<{ postCount: number; error?: string }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      const result = data.results?.[0];
      if (result?.error) throw new Error(result.error);
      toast.success(`Synced ${result?.postCount ?? 0} posts from ${voicePlatform}`);
      void loadVoice();
      void loadHistorySync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OAuth sync failed");
    } finally {
      setSyncingVoice(false);
    }
  }

  async function importVoice() {
    if (!importText.trim()) return;
    setVoiceLoading(true);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/brand-profile/platform-voice/${voicePlatform}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel: voiceChannel, raw: importText }),
        },
      );
      if (!res.ok) throw new Error("Import failed");
      setImportText("");
      toast.success("Samples imported");
      void loadVoice();
    } catch {
      toast.error("Import failed");
    } finally {
      setVoiceLoading(false);
    }
  }

  async function analyzeVoice() {
    setVoiceLoading(true);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/brand-profile/platform-voice/${voicePlatform}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel: voiceChannel, allChannels: true }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Analyze failed");
      }
      toast.success("Voice analyzed");
      void loadVoice();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analyze failed");
    } finally {
      setVoiceLoading(false);
    }
  }

  const channelData = voiceProfile?.channels?.[voiceChannel];

  return {
    voicePlatform,
    setVoicePlatform,
    voiceChannel,
    setVoiceChannel,
    importText,
    setImportText,
    voiceLoading,
    historySync,
    syncingVoice,
    channelData,
    syncVoiceFromOAuth,
    importVoice,
    analyzeVoice,
  };
}
