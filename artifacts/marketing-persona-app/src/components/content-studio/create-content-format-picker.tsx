"use client";

import {
  FORMAT_META,
  formatCategoriesForSurface,
  type ContentFormatType,
  type ProductSurface,
} from "./content-studio-format-data";
import { cn } from "@/lib/utils";

export function CreateContentFormatPicker({
  onSelect,
  surface = "blog_wordpress",
}: {
  onSelect: (type: ContentFormatType) => void;
  /** Which format set to offer. Defaults to the blog surface. */
  surface?: ProductSurface;
}) {
  return (
    <div className="space-y-8 mt-8 max-h-[min(60vh,520px)] overflow-y-auto pr-1">
      {formatCategoriesForSurface(surface).map((cat) => (
        <div key={cat.label}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
            {cat.label}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {cat.formats.map((type) => (
              <FormatOptionButton key={type} type={type} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FormatOptionButton({
  type,
  onSelect,
}: {
  type: ContentFormatType;
  onSelect: (type: ContentFormatType) => void;
}) {
  const meta = FORMAT_META[type];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className="group text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/40 transition-all"
    >
      <div className="flex items-start gap-3">
        <span className={cn("p-2 rounded-lg shrink-0", meta.color)}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{meta.label}</span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {meta.wordRange}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{meta.description}</p>
        </div>
      </div>
    </button>
  );
}
