"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { connectLinkedin, pasteLinkedinSamples, OnboardingApiError } from "../onboarding-api";
import { linkedinModeFromResponse } from "../onboarding-logic";
import { ConnectShell } from "./connect-shell";
import type { OnboardingAnswers } from "@workspace/db/schema/onboarding_sessions";

const MIN_POSTS = 3;
const MAX_POSTS = 5;

/** Splits a pasted blob of posts on blank lines so people can paste a batch at once. */
function splitPosts(raw: string): string[] {
  return raw
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function LinkedinStep({
  answer,
  onResolved,
}: {
  answer: OnboardingAnswers["linkedin"];
  onResolved: (value: OnboardingAnswers["linkedin"]) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [mode, setMode] = useState<"idle" | "paste">(answer?.mode === "paste" ? "paste" : "idle");
  const [pasteText, setPasteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolved = answer?.mode === "oauth" || answer?.mode === "skipped";

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectLinkedin();
      const kind = linkedinModeFromResponse(result);
      if (kind === "paste") {
        // Not an error path: most customers land here because LinkedIn only
        // grants post-reading access to approved partner apps.
        setMode("paste");
      } else {
        onResolved({ mode: "oauth", postCount: "postCount" in result ? result.postCount : undefined });
      }
    } catch {
      setError("We couldn't reach LinkedIn just now.");
    } finally {
      setConnecting(false);
    }
  }

  async function handlePasteSubmit() {
    const posts = splitPosts(pasteText);
    if (posts.length < MIN_POSTS) {
      setError(`Paste at least ${MIN_POSTS} posts, separated by a blank line.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { postCount } = await pasteLinkedinSamples(posts.slice(0, MAX_POSTS));
      onResolved({ mode: "paste", postCount });
    } catch (err) {
      setError(err instanceof OnboardingApiError ? err.message : "Could not save those posts. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (resolved) {
    return (
      <ConnectShell
        connected
        connectedLabel={
          answer?.mode === "oauth"
            ? `LinkedIn connected${answer.postCount ? `, ${answer.postCount} posts read` : ""}`
            : "LinkedIn skipped"
        }
        connecting={false}
        onConnect={() => {}}
        onSkip={() => {}}
        connectLabel=""
      />
    );
  }

  if (answer?.mode === "paste") {
    return (
      <ConnectShell
        connected
        connectedLabel={`Voice learned from ${answer.postCount ?? "your"} posts`}
        connecting={false}
        onConnect={() => {}}
        onSkip={() => {}}
        connectLabel=""
      />
    );
  }

  if (mode === "paste") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          LinkedIn only shares posts with a handful of approved apps, so paste in {MIN_POSTS} to {MAX_POSTS} of your
          recent posts instead. Separate each one with a blank line.
        </p>
        <Textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={"Excited to share our latest case study...\n\nOne thing I've learned running a firm..."}
          rows={8}
          autoFocus
          aria-label="Paste your LinkedIn posts"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onResolved({ mode: "skipped" })}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Skip this for now
          </button>
          <Button type="button" onClick={handlePasteSubmit} disabled={saving}>
            {saving ? "Saving…" : "Use these posts"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ConnectShell
      connected={false}
      connecting={connecting}
      onConnect={handleConnect}
      onSkip={() => onResolved({ mode: "skipped" })}
      connectLabel="Connect LinkedIn"
      error={error}
      onRetry={handleConnect}
    />
  );
}
