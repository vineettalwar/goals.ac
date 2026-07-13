"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function IntegrationIconBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function IntegrationTile({
  icon,
  title,
  description,
  connected,
  summary,
  onClick,
  className,
  pending,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  connected: boolean;
  summary?: string | null;
  onClick: () => void;
  className?: string;
  /** Account linked but setup incomplete (e.g. pick a property). */
  pending?: boolean;
}) {
  const status = connected ? (pending ? "pending" : "connected") : "idle";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5 text-left transition-all",
        "hover:border-border hover:bg-muted/20 hover:shadow-sm",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        status === "connected" && "border-emerald-500/25 bg-emerald-500/3",
        status === "pending" && "border-amber-500/25 bg-amber-500/3",
        className,
      )}
    >
      <IntegrationIconBox>{icon}</IntegrationIconBox>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
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

export function IntegrationCategorySection({
  title,
  description,
  connectedCount,
  totalCount,
  children,
  compact,
}: {
  title: string;
  description?: string;
  connectedCount: number;
  totalCount: number;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 border-b border-border/50 pb-2">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {!compact && description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {connectedCount}/{totalCount}
        </span>
      </div>
      {children}
    </section>
  );
}

export function IntegrationTabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
      {count}
    </span>
  );
}
