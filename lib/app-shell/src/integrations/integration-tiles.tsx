import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../cn";
import { IntegrationIconBox } from "./integration-icons";

export function IntegrationTile({
  icon,
  title,
  description,
  connected,
  summary,
  onClick,
  pending,
  compact = false,
  tierBadge,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  connected: boolean;
  summary?: string | null;
  onClick: () => void;
  pending?: boolean;
  compact?: boolean;
  tierBadge?: string | null;
}) {
  const status = connected ? (pending ? "pending" : "connected") : "idle";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card text-left transition-all",
        compact ? "px-3 py-2.5" : "p-4",
        "hover:border-border hover:bg-muted/20 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        status === "connected" && "border-emerald-500/25 bg-emerald-500/3",
        status === "pending" && "border-amber-500/25 bg-amber-500/3",
      )}
    >
      <IntegrationIconBox className="border-0 bg-transparent p-0">{icon}</IntegrationIconBox>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {tierBadge ? (
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {tierBadge}
            </span>
          ) : null}
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              status === "connected" && "bg-emerald-500",
              status === "pending" && "bg-amber-500",
              status === "idle" && "bg-muted-foreground/25",
            )}
            aria-hidden
          />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {connected && summary ? summary : description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
    </button>
  );
}
