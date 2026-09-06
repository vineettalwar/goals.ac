import { AlertTriangle, Loader2, Plus, Users } from "lucide-react";
import { hostFromUrl } from "@workspace/content-engine/support/competitor/competitor-url";
import { type CreateCompetitorOption, MAX_COMPETITOR_URLS } from "./create-content-types";

export function CompetitorsStep({
  competitorsLoading,
  sessionCompetitorUrls,
  focusCompetitorUrl,
  competitorMeta,
  onToggleFocus,
  newCompetitorUrl,
  onChangeNewUrl,
  onAddCompetitor,
}: {
  competitorsLoading: boolean;
  sessionCompetitorUrls: string[];
  focusCompetitorUrl: string;
  competitorMeta: Map<string, CreateCompetitorOption>;
  onToggleFocus: (url: string) => void;
  newCompetitorUrl: string;
  onChangeNewUrl: (value: string) => void;
  onAddCompetitor: () => void;
}) {
  return (
    <div className="mt-4 space-y-3.5">
      {competitorsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading competitor context…
        </div>
      ) : null}

      {!competitorsLoading && sessionCompetitorUrls.length === 0 ? (
        <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            No competitors on file for this project yet. Quick-add one below, or manage them in
            Brand settings / Research.
          </p>
        </div>
      ) : null}

      <div className="max-h-[min(36vh,280px)] space-y-2 overflow-y-auto pr-1">
        {sessionCompetitorUrls.map((url) => {
          const meta = competitorMeta.get(hostFromUrl(url));
          const isFocus = hostFromUrl(focusCompetitorUrl ?? "") === hostFromUrl(url);
          const gaps = meta?.contentGaps?.filter(Boolean).slice(0, 2) ?? [];
          return (
            <button
              key={url}
              type="button"
              onClick={() => onToggleFocus(url)}
              className={
                isFocus
                  ? "flex w-full flex-col items-start rounded-xl border border-primary bg-primary/5 px-3.5 py-2.5 text-left"
                  : "flex w-full flex-col items-start rounded-xl border border-border px-3.5 py-2.5 text-left hover:border-primary/60 hover:bg-secondary/40"
              }
            >
              <span className="flex w-full items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium">
                  {meta?.name?.trim() || hostFromUrl(url)}
                </span>
                {meta?.threatLevel ? (
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {meta.threatLevel}
                  </span>
                ) : (
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    On file
                  </span>
                )}
              </span>
              <span className="mt-0.5 truncate pl-5 text-xs text-muted-foreground">{url}</span>
              {isFocus ? (
                <span className="mt-1.5 pl-5 text-xs text-primary">
                  Primary competitor for this piece
                </span>
              ) : null}
              {gaps.length > 0 ? (
                <ul className="mt-2 space-y-0.5 border-t border-border/60 pt-2 pl-5 text-xs text-muted-foreground">
                  {gaps.map((gap) => (
                    <li key={gap}>· {gap}</li>
                  ))}
                </ul>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          value={newCompetitorUrl}
          onChange={(event) => onChangeNewUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddCompetitor();
            }
          }}
          placeholder="Quick-add competitor URL"
          disabled={sessionCompetitorUrls.length >= MAX_COMPETITOR_URLS}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onAddCompetitor}
          disabled={
            sessionCompetitorUrls.length >= MAX_COMPETITOR_URLS || !newCompetitorUrl.trim()
          }
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-secondary disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Up to {MAX_COMPETITOR_URLS} URLs. Focus is optional — without a tap, the first URL is
        primary.
      </p>
    </div>
  );
}
