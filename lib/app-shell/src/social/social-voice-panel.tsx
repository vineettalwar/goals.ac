import { Loader2, Mic2, RefreshCw } from "lucide-react";
import {
  SOCIAL_PLATFORM_OPTIONS,
  type HistorySyncPlatformStatus,
  type PlatformVoiceProfile,
  type SocialPlatformId,
} from "./types";

export function SocialVoicePanel({
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
}: {
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
}) {
  const syncStatus = historySync[voicePlatform];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Voice platform"
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm"
          value={voicePlatform}
          onChange={(event) => onVoicePlatformChange(event.target.value as SocialPlatformId)}
        >
          {SOCIAL_PLATFORM_OPTIONS.map((platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.label}
            </option>
          ))}
        </select>
        {voicePlatform === "linkedin" ? (
          <select
            aria-label="LinkedIn channel"
            className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm"
            value={voiceChannel}
            onChange={(event) => onVoiceChannelChange(event.target.value)}
          >
            <option value="posts">Posts</option>
            <option value="articles">Articles</option>
          </select>
        ) : null}
        {voicePlatform === "twitter" ? (
          <select
            aria-label="X channel"
            className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm"
            value={voiceChannel}
            onChange={(event) => onVoiceChannelChange(event.target.value)}
          >
            <option value="tweets">Tweets</option>
            <option value="threads">Threads</option>
          </select>
        ) : null}
      </div>

      <div className="paper-card space-y-3 p-4">
        <div>
          <h3 className="text-sm font-semibold">Import past posts</h3>
          <p className="text-sm text-muted-foreground">
            Sync from your connected account or paste posts separated by blank lines or{" "}
            <code>---</code>.
          </p>
        </div>
        {syncStatus ? (
          <p className="text-xs text-muted-foreground">
            {syncStatus.lastSyncedAt
              ? `Last OAuth sync: ${new Date(syncStatus.lastSyncedAt).toLocaleString("en-US", { timeZone: "UTC" })} (${syncStatus.postCount ?? 0} posts)`
              : syncStatus.connected
                ? "Account connected — sync to import posts"
                : "Connect this platform in Integrations to enable OAuth sync"}
            {syncStatus.error ? (
              <span className="mt-1 block text-destructive">{syncStatus.error}</span>
            ) : null}
          </p>
        ) : null}
        <button
          type="button"
          disabled={syncingVoice || !syncStatus?.connected}
          onClick={() => void onSyncVoiceFromOAuth()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm disabled:opacity-50"
        >
          {syncingVoice ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync from account
        </button>
        <textarea
          value={importText}
          onChange={(event) => onImportTextChange(event.target.value)}
          placeholder="Paste your LinkedIn posts here…"
          rows={8}
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={voiceLoading}
            onClick={() => void onImportVoice()}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"
          >
            Import samples
          </button>
          <button
            type="button"
            disabled={voiceLoading}
            onClick={() => void onAnalyzeVoice()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm disabled:opacity-50"
          >
            <Mic2 className="h-4 w-4" />
            Analyze voice
          </button>
        </div>
      </div>

      {voiceLoading && !channelData ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : channelData ? (
        <div className="paper-card space-y-4 p-4 text-sm">
          <div>
            <h3 className="text-sm font-semibold">Extracted voice</h3>
            {channelData.lastAnalyzedAt ? (
              <p className="text-xs text-muted-foreground">
                Last analyzed{" "}
                {new Date(channelData.lastAnalyzedAt).toLocaleString("en-US", { timeZone: "UTC" })}
              </p>
            ) : null}
          </div>
          {channelData.typicalStructure ? (
            <div>
              <p className="mb-1 font-medium">Structure</p>
              <p className="text-muted-foreground">{channelData.typicalStructure}</p>
            </div>
          ) : null}
          {channelData.hookPatterns?.length > 0 ? (
            <div>
              <p className="mb-1 font-medium">Hook patterns</p>
              <div className="flex flex-wrap gap-1">
                {channelData.hookPatterns.map((hook) => (
                  <span key={hook} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {hook}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {channelData.voiceTraits?.length > 0 ? (
            <div>
              <p className="mb-1 font-medium">Voice traits</p>
              <div className="flex flex-wrap gap-1">
                {channelData.voiceTraits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full border border-border px-2 py-0.5 text-xs"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <p className="mb-1 font-medium">
              Samples ({channelData.writingExamples?.length ?? 0})
            </p>
            <p className="line-clamp-3 text-muted-foreground">
              {channelData.writingExamples?.[0]?.slice(0, 280) ?? "No samples yet"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
