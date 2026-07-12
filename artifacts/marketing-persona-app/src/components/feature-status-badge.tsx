import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FeatureStatus = "live" | "beta" | "coming-soon";

const STYLES: Record<FeatureStatus, string> = {
  live: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  beta: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "coming-soon": "bg-violet-500/10 text-violet-700 border-violet-500/20",
};

const LABELS: Record<FeatureStatus, string> = {
  live: "Live",
  beta: "Beta",
  "coming-soon": "Coming soon",
};

export function FeatureStatusBadge({
  status,
  className,
}: {
  status: FeatureStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", STYLES[status], className)}>
      {LABELS[status]}
    </Badge>
  );
}
