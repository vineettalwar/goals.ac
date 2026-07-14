import {
  BookOpen, Newspaper, GraduationCap, Map as MapIcon, FileSearch, LayoutTemplate, Globe, ImageIcon,
  Linkedin, Twitter, Instagram, Mail, Megaphone, MonitorPlay, Package, Radio, HelpCircle,
} from "lucide-react";
import type { ContentFormatType } from "./content-studio-types";
import { FORMAT_META } from "./content-studio-types";

export function FormatBadge({ type }: { type: ContentFormatType }) {
  const meta = FORMAT_META[type];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {meta.label}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  published: "Published",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  draft: "bg-amber-400",
  ready: "bg-green-500",
  published: "bg-blue-500",
  pending: "bg-slate-400",
  in_progress: "bg-blue-400",
  completed: "bg-green-500",
};

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
