"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, PenLine, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface Props {
  projectId: string;
  onDrafted?: () => void;
}

interface SkillState {
  skill: string;
  skillLocked: boolean;
  skillVersion: number;
}

interface SourceStats {
  totalSources: number;
  byType: Record<string, number>;
  lastIndexedAt: string | null;
  hasSkill: boolean;
}

export function BrandVoiceSkillEditor({ projectId, onDrafted }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [form, setForm] = useState<SkillState>({ skill: "", skillLocked: false, skillVersion: 0 });
  const [stats, setStats] = useState<SourceStats | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [skillRes, sourcesRes] = await Promise.all([
        fetch(`/api/website-projects/${projectId}/brand-voice/skill`),
        fetch(`/api/website-projects/${projectId}/brand-voice/sources`),
      ]);
      if (skillRes.ok) {
        const data = (await skillRes.json()) as SkillState;
        setForm(data);
      }
      if (sourcesRes.ok) {
        const data = (await sourcesRes.json()) as { stats: SourceStats };
        setStats(data.stats);
      }
    } catch {
      toast.error("Failed to load brand voice skill");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/brand-voice/skill`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: form.skill, skillLocked: form.skillLocked }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as SkillState;
      setForm(data);
      toast.success("Brand voice skill saved");
    } catch {
      toast.error("Failed to save brand voice skill");
    } finally {
      setSaving(false);
    }
  }

  const skillEmpty = !form.skill.trim();

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/brand-voice/skill`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Regenerate failed");
      const data = (await res.json()) as SkillState & { regenerated: boolean };
      setForm(data);
      if (!data.regenerated) {
        toast.success("Skill is locked — unlock to regenerate");
      } else if (skillEmpty) {
        toast.success("Starting voice drafted. Review it, then save.");
        onDrafted?.();
      } else {
        toast.success("Skill regenerated from your content");
        onDrafted?.();
      }
      void load(true);
    } catch {
      toast.error("Failed to draft brand voice");
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Spinner className="h-4 w-4" />
        Loading brand voice skill…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <img
              src="/agents/chameleon.webp"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded-md object-cover"
            />
            Brand Voice Skill
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Voice guide for drafts. Empty is fine — The Chameleon can draft a starting version.
          </p>
        </div>
        {stats && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{stats.totalSources} sources</Badge>
            {/* Learning from edits is invisible unless we say so. */}
            {(stats.byType?.user_edit ?? 0) > 0 && (
              <Badge variant="outline">
                Shaped by {stats.byType.user_edit} of your edit
                {stats.byType.user_edit === 1 ? "" : "s"}
              </Badge>
            )}
            {stats.lastIndexedAt && (
              <Badge variant="outline">
                Indexed {new Date(stats.lastIndexedAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
        )}
      </div>

      {skillEmpty && (
        <div className="flex items-start gap-4 rounded-lg border border-border bg-secondary/60 px-4 py-4">
          <img
            src="/agents/chameleon.webp"
            alt="The Chameleon, brand voice coach"
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">Don&apos;t know what to write?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The Chameleon (brand voice coach) drafts this from your project name, site, and any
              samples. You can edit every line before saving.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={handleRegenerate}
              disabled={regenerating || form.skillLocked}
            >
              {regenerating ? (
                <Spinner className="h-4 w-4 mr-1.5" />
              ) : (
                <PenLine className="h-4 w-4 mr-1.5" />
              )}
              Draft starting voice
            </Button>
          </div>
        </div>
      )}

      <Textarea
        value={form.skill}
        onChange={(e) => setForm((p) => ({ ...p, skill: e.target.value }))}
        rows={skillEmpty ? 8 : 16}
        className="font-mono text-xs leading-relaxed"
        placeholder="Or paste your own voice guide here…"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="skill-locked"
            checked={form.skillLocked}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, skillLocked: checked }))}
          />
          <Label htmlFor="skill-locked" className="text-sm flex items-center gap-1.5 cursor-pointer">
            <Lock className="h-3.5 w-3.5" />
            Lock — don&apos;t auto-overwrite on re-index
          </Label>
        </div>
        <div className="flex gap-2">
          {!skillEmpty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating || form.skillLocked}
            >
              {regenerating ? <Spinner className="h-4 w-4 mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Regenerate
            </Button>
          )}
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4 mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save skill
          </Button>
        </div>
      </div>
    </div>
  );
}
