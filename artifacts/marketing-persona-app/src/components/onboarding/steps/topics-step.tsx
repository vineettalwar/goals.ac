"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { MultiSelectQuestion, type MultiChoiceOption } from "./basic-inputs";

type Opportunity = { id: number; suggestedTitle: string; keyword: string; source: string };

const POLL_MS = 4000;
const MAX_POLLS = 8;

/**
 * Topic candidates come from the existing keyword-opportunities engine (GSC gap,
 * competitor gap, or AI cold-start per D6) via the already-shipped
 * `/api/website-projects/[id]/keyword-opportunities` route. The fixed onboarding
 * contract does not name a topics-listing endpoint of its own, so this reuses
 * real infra rather than inventing a parallel one.
 */
export function TopicsStep({
  websiteProjectId,
  selected,
  onToggle,
}: {
  websiteProjectId: number | null;
  selected: number[];
  onToggle: (id: number) => void;
}) {
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const triedDiscover = useRef(false);
  const polls = useRef(0);

  useEffect(() => {
    if (!websiteProjectId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const res = await fetch(`/api/website-projects/${websiteProjectId}/keyword-opportunities`);
        if (!res.ok) throw new Error();
        const { opportunities: opps } = (await res.json()) as { opportunities: Opportunity[] };
        if (cancelled) return;
        setOpportunities(opps);
        if (opps.length === 0 && !triedDiscover.current) {
          triedDiscover.current = true;
          await fetch(`/api/website-projects/${websiteProjectId}/keyword-opportunities`, { method: "POST" }).catch(
            () => {}
          );
        }
        polls.current += 1;
        if (opps.length === 0 && polls.current < MAX_POLLS) {
          timer = setTimeout(load, POLL_MS);
        }
      } catch {
        if (!cancelled) setOpportunities([]);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [websiteProjectId]);

  if (opportunities === null) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Finding topics worth writing about…
      </div>
    );
  }

  const options: MultiChoiceOption[] = opportunities.map((o) => ({
    id: o.id,
    label: o.suggestedTitle,
    helper: o.keyword,
  }));

  return (
    <MultiSelectQuestion
      options={options}
      selected={selected}
      onToggle={onToggle}
      emptyState={
        <p className="text-sm text-muted-foreground">
          We're still building your topic list. Continue and we will queue the first batch as soon as they're
          ready.
        </p>
      }
    />
  );
}
