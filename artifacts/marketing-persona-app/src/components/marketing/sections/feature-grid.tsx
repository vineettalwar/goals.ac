"use client";

import type { LucideIcon } from "lucide-react";

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type FeatureGridProps = {
  items: FeatureItem[];
  columns?: 2 | 3;
  surface?: "paper" | "glass";
};

export function FeatureGrid({ items }: FeatureGridProps) {
  return (
    <ul className="max-w-2xl space-y-6">
      {items.map(({ title, description }) => (
        <li key={title}>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </li>
      ))}
    </ul>
  );
}
