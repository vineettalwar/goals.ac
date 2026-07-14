"use client";

import { Plus, Trash2 } from "lucide-react";
import { useStableRowKeys } from "@/hooks/use-stable-row-keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function StringListEditor({
  label,
  description,
  emptyDescription,
  placeholder,
  addFirstLabel,
  addAnotherLabel,
  maxItems,
  values,
  onChange,
}: {
  label: string;
  description: string;
  emptyDescription: string;
  placeholder: string;
  addFirstLabel: string;
  addAnotherLabel: string;
  maxItems: number;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const rowKeys = useStableRowKeys(values.length);

  function append() {
    if (values.length >= maxItems) return;
    onChange([...values, ""]);
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function update(index: number, value: string) {
    onChange(values.map((v, i) => (i === index ? value : v)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {values.length > 0 && (
          <Badge variant="muted" className="shrink-0">
            {values.length}/{maxItems}
          </Badge>
        )}
      </div>

      {values.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">{emptyDescription}</p>
          <Button type="button" variant="outline" size="sm" onClick={append}>
            <Plus className="w-4 h-4 mr-1.5" />
            {addFirstLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {values.map((value, index) => (
            <div key={rowKeys[index]} className="flex gap-2">
              <Input
                value={value}
                onChange={(e) => update(index, e.target.value)}
                placeholder={placeholder}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                aria-label={`Remove ${label} item ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {values.length > 0 && values.length < maxItems && (
        <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={append}>
          <Plus className="w-4 h-4 mr-1.5" />
          {addAnotherLabel}
        </Button>
      )}
    </div>
  );
}
