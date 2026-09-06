import { Plus, TrendingUp, Trash2 } from "lucide-react";
import { cn } from "../cn";
import { KeywordRankChart, SerpFeaturesPanel, parseSerpFeatures, type KeywordRankSnapshot } from "./keyword-rank-chart";
import { btnOutline, btnPrimary, inputClass } from "./shared";
import type { TrackedKeywordRow } from "./keyword-tracking-types";

export function KeywordTrackingTab({
  tracked,
  trackInput,
  onTrackInputChange,
  onTrackKeyword,
  tracking,
  selectedTrackedId,
  onSelectTracked,
  onDeleteTracked,
  snapshots,
}: {
  tracked: TrackedKeywordRow[];
  trackInput: string;
  onTrackInputChange: (value: string) => void;
  onTrackKeyword?: () => void;
  tracking?: boolean;
  selectedTrackedId: number | null;
  onSelectTracked: (id: number) => void;
  onDeleteTracked?: (id: number) => void;
  snapshots: KeywordRankSnapshot[];
}) {
  return (
    <div className="paper-card space-y-4 rounded-xl p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <TrendingUp className="h-4 w-4" /> Rank tracking
      </h2>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Keyword to track"
          value={trackInput}
          onChange={(event) => onTrackInputChange(event.target.value)}
          className={cn(inputClass, "flex-1")}
        />
        {onTrackKeyword ? (
          <button
            type="button"
            disabled={tracking || !trackInput.trim()}
            onClick={onTrackKeyword}
            className={btnPrimary}
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {tracked.map((kw) => (
          <div
            key={kw.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
          >
            <button
              type="button"
              className="flex-1 text-left"
              onClick={() => onSelectTracked(kw.id)}
            >
              <span className="font-medium">{kw.keyword}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {kw.latestSnapshot?.position != null
                  ? `#${kw.latestSnapshot.position}`
                  : "—"}
              </span>
            </button>
            {onDeleteTracked ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-red-600"
                onClick={() => onDeleteTracked(kw.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {selectedTrackedId != null ? (
        <>
          <KeywordRankChart snapshots={snapshots} />
          <SerpFeaturesPanel
            features={parseSerpFeatures(
              snapshots[0]?.serpFeatures ??
                tracked.find((kw) => kw.id === selectedTrackedId)?.latestSnapshot?.serpFeatures,
            )}
          />
        </>
      ) : null}
    </div>
  );
}
