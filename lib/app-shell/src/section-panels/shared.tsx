import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../cn";
import type { SectionLinkProps } from "../section/types";

export function SectionLink({
  renderLink,
  ...props
}: SectionLinkProps & { renderLink: (props: SectionLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

export function PanelLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function MetricRow({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  if (items.length === 0) return null;
  return (
    <p className="text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 ? (
            <span className="mx-1.5 text-border" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="font-medium tabular-nums text-foreground">{item.value}</span> {item.label}
        </span>
      ))}
    </p>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: _icon,
  tone: _tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "emerald" | "amber" | "blue";
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "success" | "warning" | "danger" | "primary";
}) {
  const styles = {
    muted: "border-border bg-muted text-muted-foreground",
    success: "border-border bg-secondary text-foreground",
    warning: "border-primary/40 bg-primary/10 text-primary",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
    primary: "border-primary/40 bg-primary/10 text-primary",
  };
  return (
    <span className={cn("inline-flex rounded-sm border px-2 py-0.5 text-xs font-medium capitalize", styles[tone])}>
      {label}
    </span>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

export const inputClass =
  "h-10 w-full rounded-sm border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export const btnPrimary =
  "inline-flex h-10 items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";

export const btnOutline =
  "inline-flex h-9 items-center justify-center rounded-sm border border-border px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50";

export function SectionTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; icon?: ReactNode }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.id
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ScoreRing({ score, size = "lg" }: { score: number; size?: "lg" | "md" }) {
  return (
    <p
      className={cn(
        "font-semibold tabular-nums tracking-tight score-signal",
        size === "lg" ? "text-3xl" : "text-xl",
      )}
    >
      {score}
    </p>
  );
}
