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
  compact = false,
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
  compact?: boolean;
}) {
  const status = connected ? (pending ? "pending" : "connected") : "idle";
  const statusLabel =
    status === "connected"
      ? "connected"
      : status === "pending"
        ? "needs setup"
        : title.toLowerCase().includes("export")
          ? "export only, no connection required"
          : "not connected";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title}, ${statusLabel}`}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card text-left transition-all",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
        "hover:border-border hover:bg-muted/20 hover:shadow-sm",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        status === "connected" && "border-emerald-500/25 bg-emerald-500/3",
        status === "pending" && "border-amber-500/25 bg-amber-500/3",
        className,
      )}
    >
      <IntegrationIconBox
        className={compact ? "h-8 w-8 rounded-md border-0 bg-transparent p-0" : undefined}
      >
        {icon}
      </IntegrationIconBox>

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

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" aria-hidden />
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

export function IntegrationTabBadge({
  count,
  loading,
}: {
  count: number;
  loading?: boolean;
}) {
  if (!loading && count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary",
        loading && "invisible",
      )}
      aria-hidden={loading}
    >
      {loading ? 0 : count}
    </span>
  );
}

export function IntegrationTilesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex h-[62px] animate-pulse items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4"
        >
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-muted" />
            <div className="h-3 w-36 rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function IntegrationCategorySkeleton({
  tileCount = 3,
  compact,
}: {
  tileCount?: number;
  compact?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 border-b border-border/50 pb-2">
        <div className="space-y-1">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          {!compact ? <div className="h-3 w-56 max-w-full animate-pulse rounded bg-muted/70" /> : null}
        </div>
        <div className="h-3 w-8 shrink-0 animate-pulse rounded bg-muted/70" />
      </div>
      <IntegrationTilesSkeleton count={tileCount} />
    </section>
  );
}
