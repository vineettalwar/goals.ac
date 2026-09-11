import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "../../cn";
import { TOOLBAR_BTN } from "./badges";

export function HumanizeSnapshotBar({
  view,
  onViewChange,
  onRevert,
  reverting,
  disabled,
}: {
  view: "after" | "before";
  onViewChange: (view: "after" | "before") => void;
  onRevert: () => void;
  reverting: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-2">
      <div className="inline-flex rounded-lg border border-input bg-card p-0.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => onViewChange("before")}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            view === "before"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Before humanize
        </button>
        <button
          type="button"
          onClick={() => onViewChange("after")}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            view === "after"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          After humanize
        </button>
      </div>
      <button
        type="button"
        onClick={onRevert}
        disabled={disabled}
        className={TOOLBAR_BTN}
        title="Restore the body from just before the last humanize pass"
      >
        {reverting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        )}
        {reverting ? "Reverting…" : "Revert to before"}
      </button>
    </div>
  );
}
