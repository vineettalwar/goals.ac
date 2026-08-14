"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Mic2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface Props {
  projectId: string;
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

export function BrandVoiceSkillEditor({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [form, setForm] = useState<SkillState>({ skill: "", skillLocked: false, skillVersion: 0 });
  const [stats, setStats] = useState<SourceStats | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/brand-voice/skill`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Regenerate failed");
      const data = (await res.json()) as SkillState & { regenerated: boolean };
      setForm(data);
      toast.success(data.regenerated ? "Skill regenerated from your content" : "Skill is locked — unlock to regenerate");
      void load();
    } catch {
      toast.error("Failed to regenerate skill");
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
            <Mic2 className="h-4 w-4 text-primary" />
            Brand Voice Skill
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated voice guide from your indexed content. Edit to tune how content is written.
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

      <Textarea
        value={form.skill}
        onChange={(e) => setForm((p) => ({ ...p, skill: e.target.value }))}
        rows={16}
        className="font-mono text-xs leading-relaxed"
        placeholder="Run a brand scan or upload samples to generate your personalized brand voice skill…"
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
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4 mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save skill
          </Button>
        </div>
      </div>
    </div>
  );
}
