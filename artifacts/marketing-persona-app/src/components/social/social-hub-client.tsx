"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import { toast } from "sonner";
import {
  BarChart3,
  Calendar,
  Check,
  Clock,
  Loader2,
  Mic2,
  PenLine,
  Send,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SocialCalendar } from "./social-calendar";
import { SocialComposerPanel } from "./social-composer-panel";
import { SocialAnalyticsPanel } from "./social-analytics-panel";

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "X / Twitter" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "bluesky", label: "Bluesky" },
  { id: "mastodon", label: "Mastodon" },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

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

type PlatformVoiceProfile = {
  channels: Record<
    string,
    {
      writingExamples: string[];
      typicalStructure: string;
      hookPatterns: string[];
      doWords: string[];
      dontWords: string[];
      voiceTraits: string[];
      lastAnalyzedAt?: string;
    }
  >;
};

type ScheduleSettings = {
  timezone: string;
  bestTimeMode: string;
  platforms: Record<
    string,
    {
      enabled?: boolean;
      slotsPerWeek?: number;
      requireApproval?: boolean;
      preferredDays?: number[];
      preferredTimes?: string[];
      minHoursBetweenPosts?: number;
    }
  >;
};

type HistorySyncPlatformStatus = {
  connected?: boolean;
  lastSyncedAt?: string;
  postCount?: number;
  error?: string;
};

export function SocialHubClient({ projectId }: { projectId: string }) {
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

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  return (
    <div className="px-8 py-8 max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Social Hub</h1>
          <p className="text-sm text-muted-foreground">
            Train platform voice, queue posts, and schedule publishing across social channels.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${projectId}/content-studio`}>Content Studio</Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="queue" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-1.5">
            <PenLine className="h-3.5 w-3.5" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-1.5">
            <Mic2 className="h-3.5 w-3.5" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void loadQueue()}>
              Refresh
            </Button>
          </div>

          {loadingQueue ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading queue…
            </div>
          ) : queue.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No social posts in the queue yet. Create LinkedIn/X/IG posts in Content Studio, then
                schedule them here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          <Link
                            href={contentPiecePath(projectId, item.id)}
                            className="hover:underline"
                          >
                            {item.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary">{item.formatType.replace(/_/g, " ")}</Badge>
                          {item.platform && <Badge variant="outline">{item.platform}</Badge>}
                          <Badge
                            variant={
                              item.approvalStatus === "approved"
                                ? "default"
                                : item.approvalStatus === "pending_review"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {item.approvalStatus.replace(/_/g, " ")}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        {item.approvalStatus === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => void submitReview(item.id)}>
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Submit
                          </Button>
                        )}
                        {item.approvalStatus === "pending_review" && (
                          <>
                            <Button size="sm" onClick={() => void approvePiece(item.id)}>
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.bodyMarkdown}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="datetime-local"
                        className="w-auto max-w-[220px]"
                        defaultValue={
                          item.scheduledAt
                            ? item.scheduledAt.slice(0, 16)
                            : ""
                        }
                        onBlur={(e) => {
                          if (e.target.value) void schedulePiece(item.id, e.target.value);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <SocialCalendar
            projectId={projectId}
            items={queue.map((item) => ({
              id: item.id,
              title: item.title,
              platform: item.platform,
              scheduledAt: item.scheduledAt,
            }))}
            loading={loadingQueue}
            onRescheduled={() => void loadQueue()}
          />
        </TabsContent>

        <TabsContent value="compose" className="mt-4">
          <SocialComposerPanel projectId={projectId} onComposed={() => void loadQueue()} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <SocialAnalyticsPanel projectId={projectId} />
        </TabsContent>

        <TabsContent value="voice" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3">
            <Select value={voicePlatform} onValueChange={(v) => setVoicePlatform(v as PlatformId)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {voicePlatform === "linkedin" && (
              <Select value={voiceChannel} onValueChange={setVoiceChannel}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="posts">Posts</SelectItem>
                  <SelectItem value="articles">Articles</SelectItem>
                </SelectContent>
              </Select>
            )}
            {voicePlatform === "twitter" && (
              <Select value={voiceChannel} onValueChange={setVoiceChannel}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tweets">Tweets</SelectItem>
                  <SelectItem value="threads">Threads</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import past posts</CardTitle>
              <CardDescription>
                Sync from your connected account or paste posts separated by blank lines or{" "}
                <code>---</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {historySync[voicePlatform] && (
                <p className="text-xs text-muted-foreground">
                  {historySync[voicePlatform]?.lastSyncedAt
                    ? `Last OAuth sync: ${new Date(historySync[voicePlatform]!.lastSyncedAt!).toLocaleString()} (${historySync[voicePlatform]?.postCount ?? 0} posts)`
                    : historySync[voicePlatform]?.connected
                      ? "Account connected — sync to import posts"
                      : "Connect this platform in Integrations to enable OAuth sync"}
                  {historySync[voicePlatform]?.error && (
                    <span className="text-destructive block mt-1">{historySync[voicePlatform]?.error}</span>
                  )}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void syncVoiceFromOAuth()}
                  disabled={syncingVoice || !historySync[voicePlatform]?.connected}
                >
                  {syncingVoice ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Sync from account
                </Button>
              </div>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your LinkedIn posts here…"
                rows={8}
              />
              <div className="flex gap-2">
                <Button onClick={() => void importVoice()} disabled={voiceLoading}>
                  Import samples
                </Button>
                <Button variant="secondary" onClick={() => void analyzeVoice()} disabled={voiceLoading}>
                  <Mic2 className="h-4 w-4 mr-1" />
                  Analyze voice
                </Button>
              </div>
            </CardContent>
          </Card>

          {voiceLoading && !channelData ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : channelData ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Extracted voice</CardTitle>
                {channelData.lastAnalyzedAt && (
                  <CardDescription>
                    Last analyzed {new Date(channelData.lastAnalyzedAt).toLocaleString()}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {channelData.typicalStructure && (
                  <div>
                    <p className="font-medium mb-1">Structure</p>
                    <p className="text-muted-foreground">{channelData.typicalStructure}</p>
                  </div>
                )}
                {channelData.hookPatterns?.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Hook patterns</p>
                    <div className="flex flex-wrap gap-1">
                      {channelData.hookPatterns.map((h) => (
                        <Badge key={h} variant="secondary">
                          {h}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {channelData.voiceTraits?.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Voice traits</p>
                    <div className="flex flex-wrap gap-1">
                      {channelData.voiceTraits.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="font-medium mb-1">
                    Samples ({channelData.writingExamples?.length ?? 0})
                  </p>
                  <p className="text-muted-foreground line-clamp-3">
                    {channelData.writingExamples?.[0]?.slice(0, 280) ?? "No samples yet"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          {settingsLoading && !settings ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings…
            </div>
          ) : settings ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Posting schedule</CardTitle>
                <CardDescription>
                  Buffer-style slots per platform. Posts require approval when enabled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 max-w-xs">
                  <label className="text-sm font-medium">Timezone</label>
                  <Input
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2 max-w-xs">
                  <label className="text-sm font-medium">Best time mode</label>
                  <Select
                    value={settings.bestTimeMode}
                    onValueChange={(v) => setSettings({ ...settings, bestTimeMode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual slots only</SelectItem>
                      <SelectItem value="suggested">Suggested slots</SelectItem>
                      <SelectItem value="analytics">Analytics-driven (sync metrics first)</SelectItem>
                    </SelectContent>
                  </Select>
                  {settings.bestTimeMode === "analytics" && (
                    <p className="text-xs text-muted-foreground">
                      Uses engagement from the Analytics tab to bias schedule suggestions.
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {PLATFORMS.map((p) => {
                    const cfg = settings.platforms[p.id] ?? {};
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "rounded-lg border p-3 space-y-2",
                          cfg.enabled === false && "opacity-60",
                        )}
                      >
                        <p className="font-medium text-sm">{p.label}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={cfg.enabled !== false}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  platforms: {
                                    ...settings.platforms,
                                    [p.id]: { ...cfg, enabled: e.target.checked },
                                  },
                                })
                              }
                            />
                            Enabled
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={cfg.requireApproval === true}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  platforms: {
                                    ...settings.platforms,
                                    [p.id]: { ...cfg, requireApproval: e.target.checked },
                                  },
                                })
                              }
                            />
                            Require approval
                          </label>
                          <label className="flex items-center gap-2">
                            Posts/week
                            <Input
                              type="number"
                              className="w-16 h-8"
                              min={1}
                              max={14}
                              value={cfg.slotsPerWeek ?? 3}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  platforms: {
                                    ...settings.platforms,
                                    [p.id]: {
                                      ...cfg,
                                      slotsPerWeek: Number(e.target.value) || 3,
                                    },
                                  },
                                })
                              }
                            />
                          </label>
                          <label className="flex items-center gap-2">
                            Min hours between
                            <Input
                              type="number"
                              className="w-16 h-8"
                              min={1}
                              max={168}
                              value={cfg.minHoursBetweenPosts ?? 24}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  platforms: {
                                    ...settings.platforms,
                                    [p.id]: {
                                      ...cfg,
                                      minHoursBetweenPosts: Number(e.target.value) || 24,
                                    },
                                  },
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Preferred days</p>
                          <div className="flex flex-wrap gap-1">
                            {DAY_LABELS.map((label, dow) => (
                              <label key={label} className="flex items-center gap-1 text-xs border rounded px-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={(cfg.preferredDays ?? [1, 3, 5]).includes(dow)}
                                  onChange={(e) => {
                                    const current = cfg.preferredDays ?? [1, 3, 5];
                                    const next = e.target.checked
                                      ? [...current, dow].sort()
                                      : current.filter((d) => d !== dow);
                                    setSettings({
                                      ...settings,
                                      platforms: {
                                        ...settings.platforms,
                                        [p.id]: { ...cfg, preferredDays: next },
                                      },
                                    });
                                  }}
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-1 max-w-xs">
                          <label className="text-xs font-medium text-muted-foreground">Preferred times (HH:MM)</label>
                          <Input
                            value={(cfg.preferredTimes ?? ["09:00"]).join(", ")}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                platforms: {
                                  ...settings.platforms,
                                  [p.id]: {
                                    ...cfg,
                                    preferredTimes: e.target.value
                                      .split(",")
                                      .map((t) => t.trim())
                                      .filter(Boolean),
                                  },
                                },
                              })
                            }
                            placeholder="09:00, 14:00"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button onClick={() => void saveSettings()} disabled={settingsLoading}>
                  Save settings
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
