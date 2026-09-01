"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { OnboardingChoiceOption } from "../onboarding-contract";

const KEY_HINT = "text-xs text-muted-foreground";

export function KeyHint({ children }: { children: React.ReactNode }) {
  return <p className={cn(KEY_HINT, "mt-3")}>{children}</p>;
}

export function TextQuestion({
  value,
  onChange,
  placeholder,
  multiline,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  inputRef?: React.Ref<HTMLTextAreaElement & HTMLInputElement>;
}) {
  if (multiline) {
    return (
      <Textarea
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus
        className="text-lg leading-relaxed"
        aria-label="Your answer"
      />
    );
  }
  return (
    <Input
      ref={inputRef as React.Ref<HTMLInputElement>}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus
      className="h-14 text-lg"
      aria-label="Your answer"
    />
  );
}

export function UrlQuestion({
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <Input
      ref={inputRef}
      type="url"
      inputMode="url"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "https://"}
      autoFocus
      className="h-14 text-lg"
      aria-label="Website address"
    />
  );
}

export function ChoiceQuestion({
  options,
  value,
  onSelect,
  highlightedIndex,
}: {
  options: OnboardingChoiceOption[];
  value: string | undefined;
  onSelect: (value: string) => void;
  highlightedIndex: number;
}) {
  return (
    <div role="listbox" aria-label="Choose one" className="flex flex-col gap-2">
      {options.map((choice, i) => {
        const selected = choice.value === value;
        const highlighted = i === highlightedIndex;
        return (
          <button
            key={choice.value}
            type="button"
            role="option"
            aria-selected={selected}
            data-choice-index={i}
            onClick={() => onSelect(choice.value)}
            className={cn(
              "paper-card flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              selected && "border-primary ring-1 ring-primary",
              highlighted && !selected && "border-primary/50 bg-secondary"
            )}
          >
            <span>
              <span className="block font-medium text-foreground">{choice.label}</span>
              {choice.blurb && <span className="block text-sm text-muted-foreground">{choice.blurb}</span>}
            </span>
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border text-xs text-muted-foreground"
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MultiTextQuestion({
  values,
  onChange,
  placeholder,
  max = 5,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const rows = values.length > 0 ? values : [""];

  function update(i: number, v: string) {
    const next = [...rows];
    next[i] = v;
    onChange(next.filter((x, idx) => x.trim() || idx === next.length - 1));
  }

  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i).length > 0 ? rows.filter((_, idx) => idx !== i) : [""]);
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={v}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            autoFocus={i === 0}
            className="h-12"
            aria-label={`Item ${i + 1}`}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove"
              className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {rows.length < max && (
        <button
          type="button"
          onClick={() => onChange([...rows, ""])}
          className="flex w-fit items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add another
        </button>
      )}
    </div>
  );
}

export type MultiChoiceOption = { id: number; label: string; helper?: string };

export function MultiSelectQuestion({
  options,
  selected,
  onToggle,
  emptyState,
}: {
  options: MultiChoiceOption[];
  selected: number[];
  onToggle: (id: number) => void;
  emptyState?: React.ReactNode;
}) {
  const [announce, setAnnounce] = useState("");

  if (options.length === 0) return <>{emptyState}</>;

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => {
              onToggle(opt.id);
              setAnnounce(isSelected ? `Removed ${opt.label}` : `Added ${opt.label}`);
            }}
            className={cn(
              "paper-card flex items-start gap-3 px-5 py-4 text-left transition-colors",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              isSelected && "border-primary ring-1 ring-primary"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
              )}
            >
              {isSelected ? "✓" : ""}
            </span>
            <span>
              <span className="block font-medium text-foreground">{opt.label}</span>
              {opt.helper && <span className="block text-sm text-muted-foreground">{opt.helper}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
