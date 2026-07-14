import type { LucideIcon } from "lucide-react";
import { cardSurfaceClass, type MarketingSurface } from "@/lib/marketing/marketing-surfaces";

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type FeatureGridProps = {
  items: FeatureItem[];
  columns?: 2 | 3;
  surface?: MarketingSurface;
};

export function FeatureGrid({ items, columns = 3, surface = "paper" }: FeatureGridProps) {
  const gridClass =
    columns === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-5"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5";

  const cardClass = cardSurfaceClass(surface);
  const iconWrapClass =
    surface === "glass"
      ? "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white"
      : "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary";
  const titleClass =
    surface === "glass" ? "text-lg font-semibold text-white" : "text-lg font-semibold";
  const descClass =
    surface === "glass"
      ? "mt-2 text-base text-white/65 leading-relaxed"
      : "mt-2 text-base text-muted-foreground leading-relaxed";

  return (
    <div className={gridClass}>
      {items.map(({ icon: Icon, title, description }) => (
        <div key={title} className={`${cardClass} p-6`}>
          <div className={iconWrapClass}>
            <Icon className="h-5 w-5" />
          </div>
          <h3 className={titleClass}>{title}</h3>
          <p className={descClass}>{description}</p>
        </div>
      ))}
    </div>
  );
}
