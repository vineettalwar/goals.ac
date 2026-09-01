"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectShell } from "./connect-shell";
import type { OnboardingAnswers } from "@workspace/db/schema/onboarding_sessions";

/**
 * Google Search Console needs a real OAuth redirect, which the fixed API contract
 * (docs/prd/production-firm-onboarding.md) does not cover: it only names the
 * onboarding session and LinkedIn voice routes. This reuses the existing
 * `/api/auth/google-search-console` start route (see src/app/api/auth/google-search-console)
 * keyed on the session's website project, opened in a new tab so the onboarding
 * screen itself is never navigated away from and progress is never lost.
 *
 * The outcome is verified rather than taken on the user's word: once the OAuth tab
 * has been opened, this polls the project's search-property connections and only
 * records `connected` when a real Google Search Console row exists. A firm that
 * clicks through OAuth but abandons the Google consent screen would otherwise be
 * marked connected, and would then get no search data with nothing explaining why.
 *
 * Search Console is optional per D6, so a failed or abandoned connection never
 * blocks completion — it just falls through to the skip path.
 */
export function SearchConsoleStep({
  answer,
  websiteProjectId,
  onResolved,
}: {
  answer: OnboardingAnswers["searchConsole"];
  websiteProjectId: number | null;
  onResolved: (value: OnboardingAnswers["searchConsole"]) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (websiteProjectId == null) return false;
    try {
      const res = await fetch(`/api/website-projects/${websiteProjectId}/search-properties`);
      if (!res.ok) return false;
      const data = (await res.json()) as {
        connections?: { provider: string; connected: boolean; propertyUrl: string | null }[];
      };
      const gsc = data.connections?.find((c) => c.provider === "google_search_console");
      if (gsc?.connected) {
        onResolved({ mode: "connected", propertyUrl: gsc.propertyUrl ?? undefined });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [websiteProjectId, onResolved]);

  // Poll while the OAuth tab is open; the callback lands in that tab, not this one.
  useEffect(() => {
    if (!opened) return;
    setChecking(true);
    pollRef.current = setInterval(() => {
      void checkConnection().then((done) => {
        if (done) {
          stopPolling();
          setChecking(false);
        }
      });
    }, 2500);
    return stopPolling;
  }, [opened, checkConnection, stopPolling]);

  // Re-check the moment the user comes back to this tab, so they rarely wait on the poll.
  useEffect(() => {
    if (!opened) return;
    function onVisible() {
      if (document.visibilityState === "visible") void checkConnection();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [opened, checkConnection]);

  if (answer?.mode === "connected" || answer?.mode === "skipped") {
    return (
      <ConnectShell
        connected
        connectedLabel={answer.mode === "connected" ? "Search Console connected" : "Search Console skipped"}
        connecting={false}
        onConnect={() => {}}
        onSkip={() => {}}
        connectLabel=""
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!websiteProjectId ? (
        <p className="text-sm text-muted-foreground">
          We need your website saved first. Go back a step if this looks wrong, or skip for now.
        </p>
      ) : (
        <a
          href={`/api/auth/google-search-console?projectId=${websiteProjectId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpened(true)}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Connect Google Search Console <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {opened && (
        <div className="flex flex-col gap-2">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {checking ? "Waiting for Google to confirm the connection…" : "Finish in the other tab, then come back here."}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => {
              setCheckFailed(false);
              void checkConnection().then((done) => {
                if (!done) setCheckFailed(true);
              });
            }}
          >
            Check again
          </Button>
          {checkFailed ? (
            <p role="alert" className="text-sm text-destructive">
              We cannot see a Search Console connection yet. Finish the Google consent screen, or skip this and we
              will use competitor research instead.
            </p>
          ) : null}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        No Search Console yet? We'll build your first topics from competitor research instead.
      </p>
      <button
        type="button"
        onClick={() => onResolved({ mode: "skipped" })}
        className="w-fit text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Skip this for now
      </button>
    </div>
  );
}
