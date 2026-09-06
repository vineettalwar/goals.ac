"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ScrapeFormSkeleton, ScrapeStatusHeader } from "@/components/projects/project-scrape-status";
import { ProjectVoiceForm, type VoiceForm } from "./project-voice-form";

import { StringListEditor } from "./project-voice-string-list";

const MAX_WRITING_EXAMPLES = 5;
const MAX_VOICE_TERMS = 20;

export function ProjectVoiceTab({
  projectId,
  isScraping,
  wasAutoFilled,
  scrapeFailed,
  onRescan,
}: {
  projectId: string;
  isScraping: boolean;
  wasAutoFilled: boolean;
  scrapeFailed: boolean;
  onRescan: () => void;
}) {
  const [form, setForm] = useState<VoiceForm>({
    writingExamples: [],
    brandGlossary: [],
    antiPatterns: [],
    typicalStructure: "",
    doWords: [],
    dontWords: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pasteSample, setPasteSample] = useState("");
  const [saved, setSaved] = useState(false);

  const loadVoice = useCallback(async () => {
    const res = await fetch(`/api/website-projects/${projectId}/brand-profile/voice`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setForm({
      writingExamples: data.writingExamples ?? [],
      brandGlossary: data.brandGlossary ?? [],
      antiPatterns: data.antiPatterns ?? [],
      typicalStructure: data.typicalStructure ?? "",
      doWords: data.doWords ?? [],
      dontWords: data.dontWords ?? [],
    });
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadVoice();
  }, [loadVoice]);

  function appendWritingExample() {
    if (form.writingExamples.length >= MAX_WRITING_EXAMPLES) return;
    setForm((p) => ({ ...p, writingExamples: [...p.writingExamples, ""] }));
  }

  function removeWritingExample(index: number) {
    setForm((p) => ({
      ...p,
      writingExamples: p.writingExamples.filter((_, i) => i !== index),
    }));
  }

  async function saveVoice() {
    setSaving(true);
    setSaved(false);
    const trimNonEmpty = (items: string[]) =>
      items.flatMap((s) => {
        const trimmed = s.trim();
        return trimmed ? [trimmed] : [];
      });

    const payload = {
      writingExamples: trimNonEmpty(form.writingExamples),
      brandGlossary: trimNonEmpty(form.brandGlossary),
      antiPatterns: trimNonEmpty(form.antiPatterns),
      typicalStructure: form.typicalStructure.trim(),
      doWords: trimNonEmpty(form.doWords),
      dontWords: trimNonEmpty(form.dontWords),
    };
    const res = await fetch(`/api/website-projects/${projectId}/brand-profile/voice`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to save brand voice");
      return;
    }
    const data = await res.json();
    setForm({
      writingExamples: data.writingExamples ?? [],
      brandGlossary: data.brandGlossary ?? [],
      antiPatterns: data.antiPatterns ?? [],
      typicalStructure: data.typicalStructure ?? "",
      doWords: data.doWords ?? [],
      dontWords: data.dontWords ?? [],
    });
    setSaved(true);
    toast.success("Brand voice saved");
    setTimeout(() => setSaved(false), 3000);
  }

  async function uploadSamples(files?: FileList | null) {
    setUploading(true);
    try {
      const formData = new FormData();
      if (pasteSample.trim().length >= 80) {
        formData.set("text", pasteSample.trim());
      }
      if (files) {
        for (const file of files) {
          formData.append("files", file);
        }
      }
      const res = await fetch(`/api/website-projects/${projectId}/brand-voice/ingest`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Upload failed");
      }
      const data = (await res.json()) as { count: number };
      toast.success(`Indexed ${data.count} sample${data.count === 1 ? "" : "s"} for brand voice`);
      setPasteSample("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function analyzeExamples() {
    const examples = form.writingExamples.flatMap((s) => {
      const trimmed = s.trim();
      return trimmed ? [trimmed] : [];
    });
    if (examples.length === 0) {
      toast.error("Add at least one writing sample first");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/brand-profile/voice/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ writingExamples: examples }),
        },
      );
      if (!res.ok) {
        toast.error("Analysis failed");
        return;
      }
      const data = await res.json();
      setForm((p) => ({
        ...p,
        brandGlossary:
          p.brandGlossary.length > 0
            ? p.brandGlossary
            : (data.suggestedGlossary as string[]).slice(0, MAX_VOICE_TERMS),
        typicalStructure: p.typicalStructure || data.suggestedStructure || "",
      }));
      toast.success("Writing examples analyzed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="paper-card space-y-4 rounded-xl p-6">
      <ScrapeStatusHeader
        title="Brand Voice"
        description="Tune voice and style so drafts match how you write."
        isScraping={isScraping}
        wasAutoFilled={wasAutoFilled}
        scrapeFailed={scrapeFailed}
        onRescan={onRescan}
      />

      {isScraping ? (
        <ScrapeFormSkeleton />
      ) : (
        <div className="space-y-6">
          <ProjectVoiceForm
            projectId={projectId}
            form={form}
            setForm={setForm}
            pasteSample={pasteSample}
            setPasteSample={setPasteSample}
            uploading={uploading}
            analyzing={analyzing}
            saving={saving}
            saved={saved}
            onUploadSamples={uploadSamples}
            onAnalyzeExamples={analyzeExamples}
            onSave={saveVoice}
            appendWritingExample={appendWritingExample}
            removeWritingExample={removeWritingExample}
          />
        </div>
      )}
    </div>
  );
}
