"use client";

import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Clock,
  Mic2,
  PenLine,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SocialCalendar } from "./social-calendar";
import { SocialComposerPanel } from "./social-composer-panel";
import { SocialAnalyticsPanel } from "./social-analytics-panel";
import { SocialHubQueueTab } from "./social-hub-queue-tab";
import { SocialHubVoiceTab } from "./social-hub-voice-tab";
import { SocialHubSettingsTab } from "./social-hub-settings-tab";
import { useSocialHubClient } from "./use-social-hub-client";

export function SocialHubClient({ projectId }: { projectId: string }) {
  const hub = useSocialHubClient(projectId);

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

      <Tabs value={hub.tab} onValueChange={(v) => hub.setTab(v as typeof hub.tab)}>
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

        <SocialHubQueueTab
          projectId={projectId}
          platformFilter={hub.platformFilter}
          onPlatformFilterChange={hub.setPlatformFilter}
          loadingQueue={hub.loadingQueue}
          queue={hub.queue}
          onRefresh={() => void hub.loadQueue()}
          onSubmitReview={(id) => void hub.submitReview(id)}
          onApprove={(id) => void hub.approvePiece(id)}
          onSchedule={(id, iso) => void hub.schedulePiece(id, iso)}
        />

        <TabsContent value="calendar" className="mt-4">
          <SocialCalendar
            projectId={projectId}
            items={hub.queue.map((item) => ({
              id: item.id,
              title: item.title,
              platform: item.platform,
              scheduledAt: item.scheduledAt,
            }))}
            loading={hub.loadingQueue}
            onRescheduled={() => void hub.loadQueue()}
          />
        </TabsContent>

        <TabsContent value="compose" className="mt-4">
          <SocialComposerPanel projectId={projectId} onComposed={() => void hub.loadQueue()} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <SocialAnalyticsPanel projectId={projectId} />
        </TabsContent>

        <SocialHubVoiceTab
          voicePlatform={hub.voicePlatform}
          voiceChannel={hub.voiceChannel}
          importText={hub.importText}
          voiceProfile={hub.voiceProfile}
          voiceLoading={hub.voiceLoading}
          historySync={hub.historySync}
          syncingVoice={hub.syncingVoice}
          channelData={hub.channelData}
          onVoicePlatformChange={hub.setVoicePlatform}
          onVoiceChannelChange={hub.setVoiceChannel}
          onImportTextChange={hub.setImportText}
          onSyncVoiceFromOAuth={() => void hub.syncVoiceFromOAuth()}
          onImportVoice={() => void hub.importVoice()}
          onAnalyzeVoice={() => void hub.analyzeVoice()}
        />

        <SocialHubSettingsTab
          settings={hub.settings}
          settingsLoading={hub.settingsLoading}
          onSettingsChange={hub.setSettings}
          onSaveSettings={() => void hub.saveSettings()}
        />
      </Tabs>
    </div>
  );
}
