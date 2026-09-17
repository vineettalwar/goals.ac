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
  comingSoon = false,
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
  comingSoon?: boolean;
}) {
  const status = connected ? (pending ? "pending" : "connected") : "idle";
  const locked = comingSoon && !connected;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      aria-disabled={locked}
      className={cn(
        "group flex w-full items-center gap-3 rounded-sm border border-border bg-card text-left",
        compact ? "px-3 py-2.5" : "p-4",
        !locked && "hover:bg-muted/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        status === "connected" && "border-foreground/40",
        status === "pending" && "border-primary/40",
        locked && "cursor-not-allowed opacity-70",
      )}
    >
      <IntegrationIconBox className="border-0 bg-transparent p-0">{icon}</IntegrationIconBox>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {locked || tierBadge ? (
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {locked ? "Coming soon" : tierBadge}
            </span>
          ) : null}
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              status === "connected" && "bg-foreground",
              status === "pending" && "bg-primary",
              status === "idle" && "bg-muted-foreground/25",
            )}
            aria-hidden
          />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {connected && summary ? summary : description}
        </p>
      </div>
      {locked ? null : (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
      )}
    </button>
  );
}
