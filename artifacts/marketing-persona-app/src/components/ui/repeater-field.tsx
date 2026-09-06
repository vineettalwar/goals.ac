"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RepeaterFieldProps<T> = {
  values: T[];
  onChange: (values: T[]) => void;
  createItem: () => T;
  maxItems: number;
  minItems?: number;
  label?: string;
  description?: string;
  addFirstLabel?: string;
  addAnotherLabel?: string;
  emptyDescription?: string;
  itemLabel?: (index: number) => string;
  className?: string;
  itemClassName?: string;
  renderItem: (item: T, index: number, update: (next: T) => void) => ReactNode;
};

export function RepeaterField<T>({
  values,
  onChange,
  createItem,
  maxItems,
  minItems = 0,
  label,
  description,
  addFirstLabel = "Add first item",
  addAnotherLabel = "Add another",
  emptyDescription,
  itemLabel,
  className,
  itemClassName,
  renderItem,
}: RepeaterFieldProps<T>) {
  const [keys, setKeys] = useState<string[]>(() =>
    values.map(() => crypto.randomUUID()),
  );

  function syncKeys(nextLength: number, removedIndex?: number) {
    setKeys((prev) => {
      if (removedIndex != null) {
        return prev.filter((_, i) => i !== removedIndex);
      }
      if (prev.length < nextLength) {
        return [
          ...prev,
          ...Array.from({ length: nextLength - prev.length }, () => crypto.randomUUID()),
        ];
      }
      return prev.slice(0, nextLength);
    });
  }

  function append() {
    if (values.length >= maxItems) return;
    onChange([...values, createItem()]);
    syncKeys(values.length + 1);
  }

  function remove(index: number) {
    if (values.length <= minItems) return;
    onChange(values.filter((_, i) => i !== index));
    syncKeys(values.length - 1, index);
  }

  function update(index: number, next: T) {
    onChange(values.map((item, i) => (i === index ? next : item)));
  }

  return (
    <div className={cn("space-y-3", className)}>
      {(label || description || values.length > 0) && (
        <div className="flex items-center justify-between gap-2">
          <div>
            {label ? <p className="text-sm font-medium">{label}</p> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {values.length > 0 ? (
            <Badge variant="muted" className="shrink-0">
              {values.length}/{maxItems}
            </Badge>
          ) : null}
        </div>
      )}

      {values.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-6 text-center">
          {emptyDescription ? (
            <p className="mx-auto mb-4 max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={append}>
            <Plus className="mr-1.5 h-4 w-4" />
            {addFirstLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {values.map((item, index) => (
            <div
              key={keys[index] ?? index}
              className={cn("paper-card space-y-3 rounded-xl p-4", itemClassName)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {itemLabel ? itemLabel(index) : `Item ${index + 1}`}
                </p>
                {values.length > minItems ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    aria-label={`Remove ${itemLabel ? itemLabel(index) : `item ${index + 1}`}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {renderItem(item, index, (next) => update(index, next))}
            </div>
          ))}
        </div>
      )}

      {values.length > 0 && values.length < maxItems ? (
        <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={append}>
          <Plus className="mr-1.5 h-4 w-4" />
          {addAnotherLabel}
        </Button>
      ) : null}
    </div>
  );
}
