"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectIntegrationsPath } from "@workspace/app-shell/project-paths";

export type VoiceGateStatus = {
  voiceReady: boolean;
  voiceBuilding: boolean;
  hasBrandVoice: boolean;
  hasPlatformVoice: boolean;
  scrapeStatus: string | null;
};

export function VoiceRequiredBanner({
  projectId,
  status,
  onRescan,
  rescanning = false,
}: {
  projectId: string;
  status: VoiceGateStatus;
  onRescan?: () => void;
  rescanning?: boolean;
}) {
  if (status.voiceReady) return null;

  const voiceHref = `/projects/${projectId}?tab=voice`;
  const socialHref = `${projectIntegrationsPath(projectId, "social")}?trainVoice=1`;

  if (status.voiceBuilding) {
    return (
      <div className="mx-8 mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        Scanning your site for brand voice…
        {onRescan ? (
          <button
            type="button"
            className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
            disabled={rescanning}
            onClick={onRescan}
          >
            Restart
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-8 mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3">
      <p className="text-sm text-foreground">
        Add a brand voice before generating.
      </p>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href={voiceHref}>Set up voice</Link>
        </Button>
        <Link href={socialHref} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          or connect social
        </Link>
      </div>
    </div>
  );
}

export function parseVoiceGateFromBrandProfile(data: Record<string, unknown> | null): VoiceGateStatus {
  return {
    voiceReady: Boolean(data?.voiceReady),
    voiceBuilding: Boolean(data?.voiceBuilding),
    hasBrandVoice: Boolean(data?.hasBrandVoice),
    hasPlatformVoice: Boolean(data?.hasPlatformVoice),
    scrapeStatus: typeof data?.scrapeStatus === "string" ? data.scrapeStatus : null,
  };
}
