"use client";

import type { LucideIcon } from "lucide-react";
import { type MarketingSurface } from "@/lib/marketing/site/marketing-surfaces";
import { useMarketingSurface } from "@/lib/marketing/site/use-marketing-theme";

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

export function FeatureGrid({ items, surface: surfaceProp }: FeatureGridProps) {
  const surface = useMarketingSurface(surfaceProp);
  const titleClass = surface === "glass" ? "font-semibold text-white" : "font-semibold";
  const descClass =
    surface === "glass"
      ? "mt-1 text-sm leading-relaxed text-white/65"
      : "mt-1 text-sm leading-relaxed text-muted-foreground";

  return (
    <ul className="max-w-2xl space-y-6">
      {items.map(({ title, description }) => (
        <li key={title}>
          <h3 className={titleClass}>{title}</h3>
          <p className={descClass}>{description}</p>
        </li>
      ))}
    </ul>
  );
}
