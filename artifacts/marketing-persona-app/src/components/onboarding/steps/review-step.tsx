"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type BrandProfileDTO = {
  scrapeStatus: string | null;
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  writingExamples: string[];
  voiceReady: boolean;
  voiceBuilding: boolean;
};

const POLL_MS = 4000;
const MAX_POLLS = 30; // ~2 minutes, then we stop nagging and just let them continue

/**
 * Shows what the background brand scrape found so far. Polls the existing
 * `/api/website-projects/[id]/brand-profile` endpoint (not part of the fixed
 * onboarding contract, but the real, already-shipped source of scrape status,
 * there is no reason to duplicate it). Never blocks: the Continue button is
 * always available, scrape complete or not.
 */
export function ReviewStep({ websiteProjectId }: { websiteProjectId: number | null }) {
  const [data, setData] = useState<BrandProfileDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!websiteProjectId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const res = await fetch(`/api/website-projects/${websiteProjectId}/brand-profile`);
        if (!res.ok) throw new Error();
        const json = (await res.json()) as BrandProfileDTO;
        if (cancelled) return;
        setData(json);
        setError(null);
        pollCount.current += 1;
        if (json.voiceBuilding && pollCount.current < MAX_POLLS) {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch {
        if (!cancelled) setError("Couldn't check scrape progress just now.");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [websiteProjectId]);

  if (!websiteProjectId) {
    return (
      <p className="text-sm text-muted-foreground">
        No website on file yet, so there is nothing to show here. We'll build your plan from what you've told us.
      </p>
    );
  }

  if (error && !data) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading your site…
      </div>
    );
  }

  const hasAnything = Boolean(data.companyName || data.voiceTone || data.industry || data.writingExamples.length);

  return (
    <div className="flex flex-col gap-4">
      {data.voiceBuilding && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Still scanning your site. This can keep
          going in the background while you carry on.
        </div>
      )}
      {!hasAnything && !data.voiceBuilding && (
        <p className="text-sm text-muted-foreground">
          We couldn't pull much from your site this time. It may block scrapers, or it's still new. No problem,
          we'll write from what you've told us and refine as we go.
        </p>
      )}
      {hasAnything && (
        <dl className="paper-card grid gap-4 px-5 py-4 text-sm">
          {data.industry && (
            <div>
              <dt className="text-muted-foreground">Industry</dt>
              <dd className="text-foreground">{data.industry}</dd>
            </div>
          )}
          {data.targetAudience && (
            <div>
              <dt className="text-muted-foreground">Audience</dt>
              <dd className="text-foreground">{data.targetAudience}</dd>
            </div>
          )}
          {data.voiceTone && (
            <div>
              <dt className="text-muted-foreground">Voice</dt>
              <dd className="text-foreground">{data.voiceTone}</dd>
            </div>
          )}
          {data.primaryKeywords.length > 0 && (
            <div>
              <dt className="text-muted-foreground">Topics we noticed</dt>
              <dd className="text-foreground">{data.primaryKeywords.slice(0, 6).join(", ")}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
