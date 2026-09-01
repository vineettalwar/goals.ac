"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for every connect step: a connect button, a visible connected
 * state, and a Skip affordance that is always present. Per the PRD, every
 * connect step must be skippable and the flow must still complete.
 */
export function ConnectShell({
  connected,
  connectedLabel,
  connecting,
  onConnect,
  onSkip,
  connectLabel,
  error,
  onRetry,
  children,
}: {
  connected: boolean;
  connectedLabel?: string;
  connecting: boolean;
  onConnect: () => void;
  onSkip: () => void;
  connectLabel: string;
  error?: string | null;
  onRetry?: () => void;
  children?: React.ReactNode;
}) {
  if (connected) {
    return (
      <div className="flex flex-col gap-4">
        <div className="paper-card flex items-center gap-3 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span className="text-foreground">{connectedLabel ?? "Connected"}</span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p>{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="mt-1 font-medium underline underline-offset-2">
              Try again
            </button>
          )}
        </div>
      )}
      <Button
        type="button"
        size="lg"
        onClick={onConnect}
        disabled={connecting}
        className={cn("w-fit")}
      >
        {connecting ? (
          <>
            <Spinner size="sm" /> Connecting…
          </>
        ) : (
          connectLabel
        )}
      </Button>
      {children}
      <button
        type="button"
        onClick={onSkip}
        className="w-fit text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Skip this for now
      </button>
    </div>
  );
}
