"use client";

import { useState } from "react";
import { Pencil, Check, X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonaCardProps {
  persona: {
    id: number;
    name: string;
    ageRange: string;
    jobTitle: string;
    painPoints: string[];
    goals: string[];
    preferredContent: string[];
  };
  onUpdate: (id: number, field: string, value: string | string[]) => Promise<void>;
}

function EditableText({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  async function save() {
    await onSave(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="flex-1 rounded border border-ring bg-card px-2 py-0.5 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="button" onClick={save} aria-label="Save" className="text-primary hover:text-primary/80"><Check className="h-3.5 w-3.5" aria-hidden /></button>
        <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" aria-hidden /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn("group flex items-center gap-1.5 text-left hover:text-primary transition-colors", className)}
    >
      <span>{value}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

function EditableList({
  items,
  onSave,
}: {
  items: string[];
  onSave: (items: string[]) => Promise<void>;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  async function saveItem(i: number) {
    const next = [...items];
    next[i] = draft;
    await onSave(next);
    setEditingIdx(null);
  }

  async function removeItem(i: number) {
    await onSave(items.filter((_, idx) => idx !== i));
  }

  async function addItem() {
    const next = [...items, "New item"];
    await onSave(next);
  }

  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="group flex items-start gap-1.5 text-sm">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
          {editingIdx === i ? (
            <div className="flex flex-1 items-center gap-1.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveItem(i); if (e.key === "Escape") setEditingIdx(null); }}
                className="flex-1 rounded border border-ring bg-card px-2 py-0.5 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button type="button" onClick={() => saveItem(i)} aria-label="Save item" className="text-primary"><Check className="h-3.5 w-3.5" aria-hidden /></button>
              <button type="button" onClick={() => setEditingIdx(null)} aria-label="Cancel edit" className="text-muted-foreground"><X className="h-3.5 w-3.5" aria-hidden /></button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setDraft(item); setEditingIdx(i); }}
              className="flex-1 text-left hover:text-primary transition-colors"
            >
              {item}
            </button>
          )}
          <button
            type="button"
            onClick={() => removeItem(i)}
            aria-label={`Remove item ${i + 1}`}
            className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <button
          onClick={addItem}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </li>
    </ul>
  );
}

export function PersonaCard({ persona, onUpdate }: PersonaCardProps) {
  return (
    <div className="paper-card p-6 space-y-5">
      <div className="space-y-1">
        <EditableText
          value={persona.name}
          onSave={(v) => onUpdate(persona.id, "name", v)}
          className="text-base font-semibold"
        />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <EditableText
            value={persona.jobTitle}
            onSave={(v) => onUpdate(persona.id, "jobTitle", v)}
          />
          <span>·</span>
          <EditableText
            value={persona.ageRange}
            onSave={(v) => onUpdate(persona.id, "ageRange", v)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pain points</p>
          <EditableList
            items={persona.painPoints}
            onSave={(v) => onUpdate(persona.id, "painPoints", v)}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Goals</p>
          <EditableList
            items={persona.goals}
            onSave={(v) => onUpdate(persona.id, "goals", v)}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred content</p>
        <div className="flex flex-wrap gap-1.5">
          {persona.preferredContent.map((c, i) => (
            <span key={i} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
