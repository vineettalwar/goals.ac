import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectIntegrationsPath } from "@workspace/app-shell/project-paths";
import type { VoiceGateStatus } from "./voice-gate";

export type { VoiceGateStatus };

export function VoiceRequiredBanner({
  projectId,
  status,
  onRescan,
  onSkip,
  rescanning = false,
  skipping = false,
}: {
  projectId: string;
  status: VoiceGateStatus;
  onRescan?: () => void;
  onSkip?: () => void;
  rescanning?: boolean;
  skipping?: boolean;
}) {
  if (status.voiceReady) return null;

  const voiceHref = `/projects/${projectId}?tab=voice`;
  const socialHref = `${projectIntegrationsPath(projectId, "social")}?trainVoice=1`;
  const skipButton = onSkip ? (
    <button
      type="button"
      className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
      disabled={skipping}
      onClick={onSkip}
    >
      Skip for now
    </button>
  ) : null;

  if (status.voiceBuilding) {
    return (
      <div className="mx-8 mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        Scanning your site for brand voice…
        <div className="ml-auto flex items-center gap-3">
          {skipButton}
          {onRescan ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
              disabled={rescanning}
              onClick={onRescan}
            >
              Restart
            </button>
          ) : null}
        </div>
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
        {skipButton}
      </div>
    </div>
  );
}
