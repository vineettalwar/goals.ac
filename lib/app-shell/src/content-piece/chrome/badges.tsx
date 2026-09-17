import type { ReactNode } from "react";
import { cn } from "../../cn";

export type ContentPieceLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  ready: "border border-border bg-secondary text-foreground",
  published: "bg-primary text-primary-foreground",
  draft: "bg-muted text-muted-foreground",
  generating: "border border-primary/40 bg-primary/10 text-primary",
  failed: "border border-destructive/40 bg-destructive/10 text-destructive",
};

export const TOOLBAR_BTN =
  "inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-transparent px-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50";
export const TOOLBAR_BTN_PRIMARY =
  "inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";
export const TOOLBAR_BTN_GHOST =
  "inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50";

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
        "inline-flex shrink-0 rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium capitalize",
        STATUS_BADGE_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-sm bg-muted px-2 py-0.5 font-mono text-[11px] font-medium capitalize text-muted-foreground">
      {children}
    </span>
  );
}
