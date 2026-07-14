"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  HistorySyncPlatformStatus,
  PlatformId,
  PlatformVoiceProfile,
  ScheduleSettings,
} from "./social-hub-types";

type QueueItem = {
  id: number;
  title: string;
  formatType: string;
  platform: string | null;
  approvalStatus: string;
  status: string;
  scheduledAt: string | null;
  bodyMarkdown: string;
};

export function useSocialHubClient(projectId: string) {
  const [tab, setTab] = useState<
    "queue" | "calendar" | "compose" | "analytics" | "voice" | "settings"
  >("queue");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const [voicePlatform, setVoicePlatform] = useState<PlatformId>("linkedin");
  const [voiceChannel, setVoiceChannel] = useState("posts");
  const [importText, setImportText] = useState("");
  const [voiceProfile, setVoiceProfile] = useState<PlatformVoiceProfile | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);

  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [historySync, setHistorySync] = useState<
    Partial<Record<PlatformId, HistorySyncPlatformStatus>>
  >({});
  const [syncingVoice, setSyncingVoice] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const qs =
        platformFilter !== "all" ? `?platform=${encodeURIComponent(platformFilter)}` : "";
      const res = await fetch(`/api/website-projects/${projectId}/social/queue${qs}`);
      if (!res.ok) throw new Error("Failed to load queue");
      const data = (await res.json()) as { items: QueueItem[] };
      setQueue(data.items);
    } catch {
      toast.error("Could not load social queue");
    } finally {
      setLoadingQueue(false);
    }
  }, [projectId, platformFilter]);

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
      const data = (await res.json()) as { platforms: Partial<Record<PlatformId, HistorySyncPlatformStatus>> };
      setHistorySync(data.platforms ?? {});
    } catch {
      /* optional */
    }
  }, [projectId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (tab === "voice") {
      void loadVoice();
      void loadHistorySync();
    }
  }, [tab, loadVoice, loadHistorySync]);

  useEffect(() => {
    if (tab === "settings") void loadSettings();
  }, [tab, loadSettings]);

  async function schedulePiece(pieceId: number, value: string) {
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
    voicePlatform,
    setVoicePlatform,
    voiceChannel,
    setVoiceChannel,
    importText,
    setImportText,
    voiceProfile,
    voiceLoading,
    settings,
    setSettings,
    settingsLoading,
    historySync,
    syncingVoice,
    channelData,
    loadQueue,
    schedulePiece,
    submitReview,
    approvePiece,
    syncVoiceFromOAuth,
    importVoice,
    analyzeVoice,
    saveSettings,
  };
}
