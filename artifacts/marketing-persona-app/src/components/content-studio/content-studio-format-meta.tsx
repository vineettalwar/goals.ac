import {
  FORMAT_META,
  type ContentFormatType,
} from "./content-studio-format-data";

const STATUS_DOT_COLORS: Record<string, string> = {
  draft: "bg-amber-500",
  ready: "bg-emerald-500",
  published: "bg-blue-500",
  prepared: "bg-violet-500",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  published: "Published",
  prepared: "Prepared",
};

export function FormatBadge({ type }: { type: string }) {
  const meta = FORMAT_META[type as ContentFormatType];
  if (!meta) return <span className="text-xs text-muted-foreground">{type}</span>;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const dot = STATUS_DOT_COLORS[status] ?? "bg-muted-foreground";
  const label =
    STATUS_LABELS[status] ??
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
