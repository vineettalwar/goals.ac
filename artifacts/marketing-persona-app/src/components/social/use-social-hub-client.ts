"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  INSTAGRAM_IMAGE_REQUIRED_MESSAGE,
  SOCIAL_FORMAT_TYPES,
  resolveSocialPiecePublicImageUrl,
  socialPieceNeedsInstagramImage,
  type HistorySyncPlatformStatus,
  type PlatformVoiceProfile,
  type ScheduleSettings,
  type SocialComposedPiece,
  type SocialComposerParent,
  type SocialHubTab,
  type SocialMetricsResponse,
  type SocialPlatformId,
  type SocialQueueItem,
} from "@workspace/app-shell";

export function useSocialHubClient(projectId: string, initialTab: SocialHubTab = "queue") {
  const [tab, setTab] = useState<SocialHubTab>(initialTab);
  const [queue, setQueue] = useState<SocialQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);

  const [composerParents, setComposerParents] = useState<SocialComposerParent[]>([]);
  const [composerParentsLoading, setComposerParentsLoading] = useState(false);
  const [composerConnected, setComposerConnected] = useState<Record<string, boolean>>({});
  const [composing, setComposing] = useState(false);
  const [composed, setComposed] = useState<SocialComposedPiece[] | null>(null);
  const [attachingImage, setAttachingImage] = useState(false);

  const [metrics, setMetrics] = useState<SocialMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsPlatformFilter, setMetricsPlatformFilter] = useState("all");
  const [metricsSyncing, setMetricsSyncing] = useState(false);
  const [metricsLastSyncedAt, setMetricsLastSyncedAt] = useState<string | null>(null);

  const [voicePlatform, setVoicePlatform] = useState<SocialPlatformId>("linkedin");
  const [voiceChannel, setVoiceChannel] = useState("posts");
  const [importText, setImportText] = useState("");
  const [voiceProfile, setVoiceProfile] = useState<PlatformVoiceProfile | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [historySync, setHistorySync] = useState<
    Partial<Record<SocialPlatformId, HistorySyncPlatformStatus>>
  >({});
  const [syncingVoice, setSyncingVoice] = useState(false);

  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const qs =
        platformFilter !== "all" ? `?platform=${encodeURIComponent(platformFilter)}` : "";
      const res = await fetch(`/api/website-projects/${projectId}/social/queue${qs}`);
      if (!res.ok) throw new Error("Failed to load queue");
      const data = (await res.json()) as { items?: SocialQueueItem[] };
      setQueue(Array.isArray(data.items) ? data.items : []);
    } catch {
      toast.error("Could not load social queue");
      setQueue([]);
    } finally {
      setLoadingQueue(false);
    }
  }, [projectId, platformFilter]);

  const loadComposerParents = useCallback(async () => {
    setComposerParentsLoading(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/content-pieces`);
      if (!res.ok) throw new Error("Failed to load content");
      const data = (await res.json()) as
        | SocialComposerParent[]
        | { pieces?: SocialComposerParent[] };
      const list = Array.isArray(data) ? data : (data.pieces ?? []);
      setComposerParents(
        list.filter(
          (piece) =>
            !SOCIAL_FORMAT_TYPES.has(piece.formatType) &&
            (piece.bodyMarkdown?.trim().length ?? 0) > 50,
        ),
      );
    } catch {
      toast.error("Could not load source content");
    } finally {
      setComposerParentsLoading(false);
    }
  }, [projectId]);

  const loadComposerConnections = useCallback(async () => {
    try {
      const res = await fetch(`/api/website-projects/${projectId}/cms-integrations`);
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, unknown>;
      setComposerConnected({
        linkedin: Boolean(data.linkedin),
        twitter: Boolean(data.twitter),
        instagram: Boolean(data.meta),
        facebook: Boolean(data.meta),
        bluesky: Boolean(data.bluesky),
        mastodon: Boolean(data.mastodon),
      });
    } catch {
      /* optional */
    }
  }, [projectId]);

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

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/schedule-settings`);
      if (!res.ok) throw new Error("Failed to load settings");
      const data = (await res.json()) as { settings: ScheduleSettings };
      setSettings(data.settings);
    } catch {
      toast.error("Could not load schedule settings");
    } finally {
      setSettingsLoading(false);
    }
  }, [projectId]);

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
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (tab === "compose") {
      void loadComposerParents();
      void loadComposerConnections();
    }
  }, [tab, loadComposerParents, loadComposerConnections]);

  useEffect(() => {
    if (tab === "analytics") {
      void loadMetrics();
      void loadMetricsStatus();
    }
  }, [tab, loadMetrics, loadMetricsStatus]);

  useEffect(() => {
    if (tab === "voice") {
      void loadVoice();
      void loadHistorySync();
    }
  }, [tab, loadVoice, loadHistorySync]);

  // Load schedule settings with the project so Queue honor requireApproval without visiting Settings.
  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function schedulePiece(pieceId: number, value: string) {
    const piece = queue.find((item) => item.id === pieceId);
    if (
      piece &&
      socialPieceNeedsInstagramImage(piece) &&
      !resolveSocialPiecePublicImageUrl(piece)
    ) {
      toast.error(INSTAGRAM_IMAGE_REQUIRED_MESSAGE);
      return;
    }
    const scheduledAt = value ? new Date(value).toISOString() : null;
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt, status: "ready" }),
    });
    if (!res.ok) {
      toast.error("Failed to schedule");
      return;
    }
    toast.success("Scheduled");
    void loadQueue();
  }

  async function submitReview(pieceId: number) {
    const res = await fetch(`/api/content-pieces/${pieceId}/submit-review`, { method: "POST" });
    if (!res.ok) {
      toast.error("Failed to submit for review");
      return;
    }
    toast.success("Submitted for review");
    void loadQueue();
  }

  async function approvePiece(pieceId: number) {
    const res = await fetch(`/api/content-pieces/${pieceId}/approve`, { method: "POST" });
    if (!res.ok) {
      toast.error("Failed to approve");
      return;
    }
    toast.success("Approved");
    void loadQueue();
  }

  async function rejectPiece(pieceId: number) {
    const res = await fetch(`/api/content-pieces/${pieceId}/reject`, { method: "POST" });
    if (!res.ok) {
      toast.error("Failed to reject");
      return;
    }
    toast.success("Rejected");
    void loadQueue();
  }

  async function reschedulePiece(pieceId: number, newDateKey: string | null) {
    const piece = queue.find((item) => item.id === pieceId);
    if (
      newDateKey != null &&
      piece &&
      socialPieceNeedsInstagramImage(piece) &&
      !resolveSocialPiecePublicImageUrl(piece)
    ) {
      toast.error(INSTAGRAM_IMAGE_REQUIRED_MESSAGE);
      return;
    }
    setReschedulingId(pieceId);
    try {
      if (newDateKey == null) {
        const res = await fetch(
          `/api/website-projects/${projectId}/social/queue/${pieceId}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Failed to unschedule");
        toast.success("Removed from calendar");
      } else {
        let scheduledAt: string;
        if (piece?.scheduledAt) {
          const prev = new Date(piece.scheduledAt);
          const [y, m, d] = newDateKey.split("-").map(Number);
          const next = new Date(prev);
          next.setFullYear(y!, m! - 1, d!);
          scheduledAt = next.toISOString();
        } else {
          const [y, m, d] = newDateKey.split("-").map(Number);
          const next = new Date();
          next.setFullYear(y!, m! - 1, d!);
          next.setHours(9, 0, 0, 0);
          scheduledAt = next.toISOString();
        }
        const res = await fetch(
          `/api/website-projects/${projectId}/social/queue/${pieceId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scheduledAt }),
          },
        );
        if (!res.ok) throw new Error("Failed to reschedule");
        toast.success("Rescheduled");
      }
      void loadQueue();
    } catch {
      toast.error("Could not reschedule post");
    } finally {
      setReschedulingId(null);
    }
  }

  function patchComposerParentImage(
    parentPieceId: number,
    pieceMetadata: SocialComposerParent["pieceMetadata"],
  ) {
    setComposerParents((prev) =>
      prev.map((parent) =>
        parent.id === parentPieceId ? { ...parent, pieceMetadata } : parent,
      ),
    );
  }

  async function attachFeaturedImageUrl(parentPieceId: number, url: string) {
    const trimmed = url.trim();
    if (!/^https:\/\//i.test(trimmed)) {
      toast.error("Use a public HTTPS image URL");
      return;
    }
    setAttachingImage(true);
    try {
      const res = await fetch(`/api/content-pieces/${parentPieceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredImageUrl: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as
        | SocialComposerParent
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(
          data && "error" in data && data.error ? data.error : "Could not attach image URL",
        );
      }
      const meta =
        data && "pieceMetadata" in data
          ? (data.pieceMetadata as SocialComposerParent["pieceMetadata"])
          : { featuredImageUrl: trimmed };
      patchComposerParentImage(parentPieceId, meta);
      toast.success("Featured image URL attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not attach image URL");
    } finally {
      setAttachingImage(false);
    }
  }

  async function useStockImage(parentPieceId: number) {
    setAttachingImage(true);
    try {
      const res = await fetch(`/api/content-pieces/${parentPieceId}/images/regenerate`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { piece?: SocialComposerParent; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Stock image search failed");
      }
      const piece = data?.piece;
      if (!piece) throw new Error("Stock image search failed");
      patchComposerParentImage(parentPieceId, piece.pieceMetadata ?? null);
      if (!resolveSocialPiecePublicImageUrl(piece)) {
        toast.message("No public HTTPS image found — paste a URL or try again");
        return;
      }
      toast.success("Stock image attached for Instagram");
      void loadQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stock image search failed");
    } finally {
      setAttachingImage(false);
    }
  }

  async function compose(parentPieceId: number, platforms: SocialPlatformId[]) {
    if (platforms.length === 0) {
      toast.error("Select a source article and at least one platform");
      return;
    }
    setComposing(true);
    setComposed(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/composer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPieceId, platforms }),
      });
      const data = (await res.json()) as { pieces?: SocialComposedPiece[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Composer failed");
      setComposed(data.pieces ?? []);
      toast.success(`Created ${data.pieces?.length ?? 0} platform variants`);
      void loadQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Composer failed");
    } finally {
      setComposing(false);
    }
  }

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

  async function saveSettings() {
    if (!settings) return;
    setSettingsLoading(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/schedule-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save settings");
    } finally {
      setSettingsLoading(false);
    }
  }

  const channelData = voiceProfile?.channels?.[voiceChannel];

  return {
    tab,
    setTab,
    queue,
    loadingQueue,
    platformFilter,
    setPlatformFilter,
    loadQueue,
    schedulePiece,
    submitReview,
    approvePiece,
    rejectPiece,
    reschedulingId,
    reschedulePiece,
    composerParents,
    composerParentsLoading,
    composerConnected,
    composing,
    composed,
    compose,
    attachingImage,
    attachFeaturedImageUrl,
    useStockImage,
    metrics,
    metricsLoading,
    metricsPlatformFilter,
    setMetricsPlatformFilter,
    metricsSyncing,
    metricsLastSyncedAt,
    syncMetrics,
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
    settings,
    setSettings,
    settingsLoading,
    saveSettings,
  };
}
