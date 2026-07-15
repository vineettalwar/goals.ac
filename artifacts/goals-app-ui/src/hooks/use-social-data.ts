import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  type SocialQueueResponse,
} from "@workspace/app-shell";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";

async function fetchQueue(projectId: string, platformFilter: string): Promise<{
  items: SocialQueueItem[];
  error: string | null;
}> {
  const platformQuery =
    platformFilter !== "all" ? `?platform=${encodeURIComponent(platformFilter)}` : "";
  try {
    const data = await apiFetch<SocialQueueResponse>(
      `/api/website-projects/${projectId}/social/queue${platformQuery}`,
    );
    return { items: data.items ?? [], error: null };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : "Failed to load social queue",
    };
  }
}

export function useSocialData(projectId: string | null, initialTab: SocialHubTab = "queue") {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SocialHubTab>(initialTab);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [metricsPlatformFilter, setMetricsPlatformFilter] = useState("all");
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ level: "success" | "error"; message: string } | null>(null);

  const notify = useCallback((level: "success" | "error", message: string) => {
    setFlash({ level, message });
    if (level === "error") console.error(`[social] ${message}`);
  }, []);

  const [composerParents, setComposerParents] = useState<SocialComposerParent[]>([]);
  const [composerParentsLoading, setComposerParentsLoading] = useState(false);
  const [composerConnected, setComposerConnected] = useState<Record<string, boolean>>({});
  const [composing, setComposing] = useState(false);
  const [composed, setComposed] = useState<SocialComposedPiece[] | null>(null);
  const [attachingImage, setAttachingImage] = useState(false);

  const [metrics, setMetrics] = useState<SocialMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
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

  const queueQuery = useQuery({
    queryKey: queryKeys.social(projectId, platformFilter),
    queryFn: () => fetchQueue(projectId!, platformFilter),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });

  const reloadQueue = useCallback(async () => {
    if (!projectId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.social(projectId, platformFilter) });
  }, [projectId, platformFilter, queryClient]);

  const loadComposerParents = useCallback(async () => {
    if (!projectId) return;
    setComposerParentsLoading(true);
    try {
      const data = await apiFetch<SocialComposerParent[] | { pieces?: SocialComposerParent[] }>(
        `/api/website-projects/${projectId}/content-pieces`,
      );
      const list = Array.isArray(data) ? data : (data.pieces ?? []);
      setComposerParents(
        list.filter(
          (piece) =>
            !SOCIAL_FORMAT_TYPES.has(piece.formatType) &&
            (piece.bodyMarkdown?.trim().length ?? 0) > 50,
        ),
      );
    } catch {
      notify("error", "Could not load source content");
    } finally {
      setComposerParentsLoading(false);
    }
  }, [projectId, notify]);

  const loadComposerConnections = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await apiFetch<Record<string, unknown>>(
        `/api/website-projects/${projectId}/cms-integrations`,
      );
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
    if (!projectId) return;
    setMetricsLoading(true);
    try {
      const qs =
        metricsPlatformFilter !== "all"
          ? `?platform=${encodeURIComponent(metricsPlatformFilter)}`
          : "";
      const data = await apiFetch<SocialMetricsResponse>(
        `/api/website-projects/${projectId}/social/metrics${qs}`,
      );
      setMetrics(data);
    } catch {
      notify("error", "Could not load social analytics");
    } finally {
      setMetricsLoading(false);
    }
  }, [projectId, metricsPlatformFilter]);

  const loadMetricsStatus = useCallback(async () => {
    if (!projectId) return;
    try {
      const status = await apiFetch<{ lastSyncedAt?: string | null }>(
        `/api/website-projects/${projectId}/social/metrics/sync`,
      );
      setMetricsLastSyncedAt(status.lastSyncedAt ?? null);
    } catch {
      /* optional until edge GET lands */
    }
  }, [projectId]);

  const loadVoice = useCallback(async () => {
    if (!projectId) return;
    setVoiceLoading(true);
    try {
      const data = await apiFetch<{ profile: PlatformVoiceProfile; channels: string[] }>(
        `/api/website-projects/${projectId}/brand-profile/platform-voice/${voicePlatform}`,
      );
      setVoiceProfile(data.profile);
      if (data.channels?.[0]) setVoiceChannel(data.channels[0]);
    } catch {
      notify("error", "Could not load platform voice");
    } finally {
      setVoiceLoading(false);
    }
  }, [projectId, voicePlatform]);

  const loadHistorySync = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await apiFetch<{
        platforms: Partial<Record<SocialPlatformId, HistorySyncPlatformStatus>>;
      }>(`/api/website-projects/${projectId}/social/history-sync`);
      setHistorySync(data.platforms ?? {});
    } catch {
      /* optional until edge GET lands */
    }
  }, [projectId]);

  const loadSettings = useCallback(async () => {
    if (!projectId) return;
    setSettingsLoading(true);
    try {
      const data = await apiFetch<{ settings: ScheduleSettings }>(
        `/api/website-projects/${projectId}/social/schedule-settings`,
      );
      setSettings(data.settings);
    } catch {
      notify("error", "Could not load schedule settings");
    } finally {
      setSettingsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (tab === "compose" && projectId) {
      void loadComposerParents();
      void loadComposerConnections();
    }
  }, [tab, projectId, loadComposerParents, loadComposerConnections]);

  useEffect(() => {
    if (tab === "analytics" && projectId) {
      void loadMetrics();
      void loadMetricsStatus();
    }
  }, [tab, projectId, loadMetrics, loadMetricsStatus]);

  useEffect(() => {
    if (tab === "voice" && projectId) {
      void loadVoice();
      void loadHistorySync();
    }
  }, [tab, projectId, loadVoice, loadHistorySync]);

  // Load schedule settings with the project so Queue honor requireApproval without visiting Settings.
  useEffect(() => {
    if (projectId) void loadSettings();
  }, [projectId, loadSettings]);

  const schedulePiece = useCallback(
    async (pieceId: number, value: string) => {
      const piece = queueQuery.data?.items.find((item) => item.id === pieceId);
      if (
        piece &&
        socialPieceNeedsInstagramImage(piece) &&
        !resolveSocialPiecePublicImageUrl(piece)
      ) {
        notify("error", INSTAGRAM_IMAGE_REQUIRED_MESSAGE);
        return;
      }
      try {
        await apiFetch(`/api/content-pieces/${pieceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: value ? new Date(value).toISOString() : null,
            status: "ready",
          }),
        });
        notify("success", "Scheduled");
        await reloadQueue();
      } catch {
        notify("error", "Failed to schedule");
      }
    },
    [reloadQueue, notify, queueQuery.data?.items],
  );

  const submitReview = useCallback(
    async (pieceId: number) => {
      try {
        await apiFetch(`/api/content-pieces/${pieceId}/submit-review`, { method: "POST" });
        notify("success", "Submitted for review");
        await reloadQueue();
      } catch {
        notify("error", "Failed to submit for review");
      }
    },
    [reloadQueue],
  );

  const approvePiece = useCallback(
    async (pieceId: number) => {
      try {
        await apiFetch(`/api/content-pieces/${pieceId}/approve`, { method: "POST" });
        notify("success", "Approved");
        await reloadQueue();
      } catch {
        notify("error", "Failed to approve");
      }
    },
    [reloadQueue],
  );

  const rejectPiece = useCallback(
    async (pieceId: number) => {
      try {
        await apiFetch(`/api/content-pieces/${pieceId}/reject`, { method: "POST" });
        notify("success", "Rejected");
        await reloadQueue();
      } catch {
        notify("error", "Failed to reject");
      }
    },
    [reloadQueue],
  );

  const reschedulePiece = useCallback(
    async (pieceId: number, newDateKey: string | null) => {
      if (!projectId) return;
      const piece = queueQuery.data?.items.find((item) => item.id === pieceId);
      if (
        newDateKey != null &&
        piece &&
        socialPieceNeedsInstagramImage(piece) &&
        !resolveSocialPiecePublicImageUrl(piece)
      ) {
        notify("error", INSTAGRAM_IMAGE_REQUIRED_MESSAGE);
        return;
      }
      setReschedulingId(pieceId);
      try {
        if (newDateKey == null) {
          await apiFetch(`/api/website-projects/${projectId}/social/queue/${pieceId}`, {
            method: "DELETE",
          });
          notify("success", "Removed from calendar");
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
          await apiFetch(`/api/website-projects/${projectId}/social/queue/${pieceId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scheduledAt }),
          });
          notify("success", "Rescheduled");
        }
        await reloadQueue();
      } catch {
        notify("error", "Could not reschedule post");
      } finally {
        setReschedulingId(null);
      }
    },
    [projectId, queueQuery.data?.items, reloadQueue, notify],
  );

  const attachFeaturedImageUrl = useCallback(
    async (parentPieceId: number, url: string) => {
      const trimmed = url.trim();
      if (!/^https:\/\//i.test(trimmed)) {
        notify("error", "Use a public HTTPS image URL");
        return;
      }
      setAttachingImage(true);
      try {
        const updated = await apiFetch<SocialComposerParent>(`/api/content-pieces/${parentPieceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ featuredImageUrl: trimmed }),
        });
        setComposerParents((prev) =>
          prev.map((parent) =>
            parent.id === parentPieceId
              ? {
                  ...parent,
                  pieceMetadata: updated.pieceMetadata ?? { featuredImageUrl: trimmed },
                }
              : parent,
          ),
        );
        notify("success", "Featured image URL attached");
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Could not attach image URL");
      } finally {
        setAttachingImage(false);
      }
    },
    [notify],
  );

  const useStockImage = useCallback(
    async (parentPieceId: number) => {
      setAttachingImage(true);
      try {
        const data = await apiFetch<{ piece?: SocialComposerParent }>(
          `/api/content-pieces/${parentPieceId}/images/regenerate`,
          { method: "POST" },
        );
        const piece = data.piece;
        if (!piece) throw new Error("Stock image search failed");
        setComposerParents((prev) =>
          prev.map((parent) =>
            parent.id === parentPieceId
              ? { ...parent, pieceMetadata: piece.pieceMetadata ?? null }
              : parent,
          ),
        );
        if (!resolveSocialPiecePublicImageUrl(piece)) {
          notify("error", "No public HTTPS image found — paste a URL or try again");
          return;
        }
        notify("success", "Stock image attached for Instagram");
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Stock image search failed");
      } finally {
        setAttachingImage(false);
      }
    },
    [notify],
  );

  const compose = useCallback(
    async (parentPieceId: number, platforms: SocialPlatformId[]) => {
      if (!projectId) return;
      if (platforms.length === 0) {
        notify("error", "Select a source article and at least one platform");
        return;
      }
      setComposing(true);
      setComposed(null);
      try {
        const data = await apiFetch<{ pieces?: SocialComposedPiece[]; error?: string }>(
          `/api/website-projects/${projectId}/social/composer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parentPieceId, platforms }),
          },
        );
        setComposed(data.pieces ?? []);
        notify("success", `Created ${data.pieces?.length ?? 0} platform variants`);
        await reloadQueue();
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Composer failed");
      } finally {
        setComposing(false);
      }
    },
    [projectId, reloadQueue, notify],
  );

  const syncMetrics = useCallback(async () => {
    if (!projectId) return;
    setMetricsSyncing(true);
    try {
      const body = await apiFetch<{
        error?: string;
        rowsUpserted?: number;
        queued?: boolean;
        jobId?: string;
      }>(`/api/website-projects/${projectId}/social/metrics/sync`, { method: "POST" });
      if (body.queued || body.jobId) {
        notify("success", "Metrics sync queued");
      } else {
        notify("success", `Synced ${body.rowsUpserted ?? 0} posts`);
      }
      await loadMetricsStatus();
      await loadMetrics();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Sync failed");
    } finally {
      setMetricsSyncing(false);
    }
  }, [projectId, loadMetrics, loadMetricsStatus]);

  const syncVoiceFromOAuth = useCallback(async () => {
    if (!projectId) return;
    setSyncingVoice(true);
    try {
      const data = await apiFetch<{
        results?: Array<{ postCount: number; error?: string }>;
        queued?: boolean;
        jobId?: string;
        error?: string;
      }>(
        `/api/website-projects/${projectId}/social/history-sync?platform=${voicePlatform}`,
        { method: "POST" },
      );
      if (data.queued || data.jobId) {
        notify("success", `Voice sync queued for ${voicePlatform}`);
      } else {
        const result = data.results?.[0];
        if (result?.error) throw new Error(result.error);
        notify("success", `Synced ${result?.postCount ?? 0} posts from ${voicePlatform}`);
      }
      void loadVoice();
      void loadHistorySync();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "OAuth sync failed");
    } finally {
      setSyncingVoice(false);
    }
  }, [projectId, voicePlatform, loadVoice, loadHistorySync]);

  const importVoice = useCallback(async () => {
    if (!projectId || !importText.trim()) return;
    setVoiceLoading(true);
    try {
      await apiFetch(
        `/api/website-projects/${projectId}/brand-profile/platform-voice/${voicePlatform}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel: voiceChannel, raw: importText }),
        },
      );
      setImportText("");
      notify("success", "Samples imported");
      void loadVoice();
    } catch {
      notify("error", "Import failed");
    } finally {
      setVoiceLoading(false);
    }
  }, [projectId, importText, voicePlatform, voiceChannel, loadVoice]);

  const analyzeVoice = useCallback(async () => {
    if (!projectId) return;
    setVoiceLoading(true);
    try {
      await apiFetch(
        `/api/website-projects/${projectId}/brand-profile/platform-voice/${voicePlatform}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel: voiceChannel, allChannels: true }),
        },
      );
      notify("success", "Voice analyzed");
      void loadVoice();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Analyze failed");
    } finally {
      setVoiceLoading(false);
    }
  }, [projectId, voicePlatform, voiceChannel, loadVoice]);

  const saveSettings = useCallback(async () => {
    if (!projectId || !settings) return;
    setSettingsLoading(true);
    try {
      await apiFetch(`/api/website-projects/${projectId}/social/schedule-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      notify("success", "Settings saved");
    } catch {
      notify("error", "Could not save settings");
    } finally {
      setSettingsLoading(false);
    }
  }, [projectId, settings]);

  const data = queueQuery.data;
  const channelData = voiceProfile?.channels?.[voiceChannel];

  return {
    tab,
    setTab,
    flash,
    clearFlash: () => setFlash(null),
    queue: data?.items ?? [],
    queueLoading: queueQuery.isPending && !data,
    queueError: data?.error ?? null,
    platformFilter,
    setPlatformFilter,
    reloadQueue,
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
