"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  INSTAGRAM_IMAGE_REQUIRED_MESSAGE,
  resolveSocialPiecePublicImageUrl,
  socialPieceNeedsInstagramImage,
  type ScheduleSettings,
  type SocialQueueItem,
} from "@workspace/app-shell/social";

export function useSocialHubQueue(projectId: string) {
  const [queue, setQueue] = useState<SocialQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
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

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

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

  return {
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
    settings,
    setSettings,
    settingsLoading,
    saveSettings,
  };
}
