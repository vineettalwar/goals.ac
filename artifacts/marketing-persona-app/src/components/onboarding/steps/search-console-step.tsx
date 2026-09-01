"use client";

import { useState } from "react";
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
 * GUESS: there is no endpoint in the contract to verify the OAuth outcome from
 * onboarding, so the "I've connected it" confirmation is a manual acknowledgement
 * rather than a live check. Search Console is optional per D6, so this never
 * blocks completion either way.
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
        <Button type="button" variant="outline" className="w-fit" onClick={() => onResolved({ mode: "connected" })}>
          I've connected it
        </Button>
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
