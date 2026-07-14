"use client";

import { Loader2, Mic2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORMS, type PlatformId, type PlatformVoiceProfile, type HistorySyncPlatformStatus } from "./social-hub-types";

export function SocialHubVoiceTab({
  voicePlatform,
  voiceChannel,
  importText,
  voiceProfile,
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
}: {
  voicePlatform: PlatformId;
  voiceChannel: string;
  importText: string;
  voiceProfile: PlatformVoiceProfile | null;
  voiceLoading: boolean;
  historySync: Partial<Record<PlatformId, HistorySyncPlatformStatus>>;
  syncingVoice: boolean;
  channelData: PlatformVoiceProfile["channels"][string] | undefined;
  onVoicePlatformChange: (v: PlatformId) => void;
  onVoiceChannelChange: (v: string) => void;
  onImportTextChange: (v: string) => void;
  onSyncVoiceFromOAuth: () => void;
  onImportVoice: () => void;
  onAnalyzeVoice: () => void;
}) {
  return (
        <TabsContent value="voice" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3">
            <Select value={voicePlatform} onValueChange={(v) => onVoicePlatformChange(v as PlatformId)}>
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
              <Select value={voiceChannel} onValueChange={onVoiceChannelChange}>
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
              <Select value={voiceChannel} onValueChange={onVoiceChannelChange}>
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
                    ? `Last OAuth sync: ${new Date(historySync[voicePlatform]!.lastSyncedAt!).toLocaleString("en-US", { timeZone: "UTC" })} (${historySync[voicePlatform]?.postCount ?? 0} posts)`
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
                  onClick={() => onSyncVoiceFromOAuth()}
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
                onChange={(e) => onImportTextChange(e.target.value)}
                placeholder="Paste your LinkedIn posts here…"
                rows={8}
              />
              <div className="flex gap-2">
                <Button onClick={() => onImportVoice()} disabled={voiceLoading}>
                  Import samples
                </Button>
                <Button variant="secondary" onClick={() => onAnalyzeVoice()} disabled={voiceLoading}>
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
                    Last analyzed {new Date(channelData.lastAnalyzedAt).toLocaleString("en-US", { timeZone: "UTC" })}
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
  );
}
