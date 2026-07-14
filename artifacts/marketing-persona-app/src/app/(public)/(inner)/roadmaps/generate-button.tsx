"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { buildAuthRedirectParams, saveRoadmapIntent } from "@/lib/projects/roadmap-intent";

import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);

export function GenerateRoadmapButton() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ industry: "", location: "", stage: "early" });

  async function handleGenerate() {
    if (!form.industry || !form.location) { toast.error("Industry and location are required"); return; }
    setGenerating(true);
    const res = await fetch("/api/roadmaps/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGenerating(false);
    if (res.status === 401) {
      saveRoadmapIntent({
        industry: form.industry,
        location: form.location,
        stage: form.stage,
        referrer: "roadmaps-catalog",
      });
      toast.info("Sign in to generate this roadmap. We'll pre-fill your selections.");
      router.push(`/signup?${buildAuthRedirectParams("roadmaps-catalog").toString()}`);
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to generate roadmap" }));
      toast.error(err.message ?? err.error ?? "Failed to generate roadmap");
      return;
    }
    const roadmap = await res.json();
    router.push(`/roadmap/${roadmap.slug}`);
  }

  if (!show) {
    return (
      <Button onClick={() => setShow(true)}>
        <Plus className="h-4 w-4" /> Generate roadmap
      </Button>
    );
  }

  return (
    <div className={`${glassCard} p-6 space-y-4 w-full max-w-lg`}>
      <h3 className="font-semibold text-white">Generate a custom roadmap</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-white/80">Industry</Label>
          <Input placeholder="e.g. SaaS" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} className="marketing-input-dark" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/80">Location</Label>
          <Input placeholder="e.g. London, UK" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className="marketing-input-dark" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/80">Stage</Label>
          <select
            className="marketing-input-dark"
            value={form.stage}
            onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}
          >
            {["early", "growth", "scale"].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? <><Spinner size="sm" /> Generating…</> : "Generate"}
        </Button>
        <Button variant="outline" onClick={() => setShow(false)}>Cancel</Button>
      </div>
    </div>
  );
}
