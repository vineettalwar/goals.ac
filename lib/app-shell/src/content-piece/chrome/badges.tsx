import type { ReactNode } from "react";
import { cn } from "../../cn";

export type ContentPieceLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  published: "bg-primary text-primary-foreground",
  draft: "bg-muted text-muted-foreground",
  generating: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export const TOOLBAR_BTN =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50";
export const TOOLBAR_BTN_PRIMARY =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";
export const TOOLBAR_BTN_GHOST =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50";

export function PieceLink({
  renderLink,
  ...props
}: ContentPieceLinkProps & {
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        STATUS_BADGE_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
      {children}
    </span>
  );
}
