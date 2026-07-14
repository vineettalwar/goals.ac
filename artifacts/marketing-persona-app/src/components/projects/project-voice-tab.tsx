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
import { BrandVoiceSkillEditor } from "@/components/brand/brand-voice-skill-editor";

const MAX_WRITING_EXAMPLES = 5;
const MAX_VOICE_TERMS = 20;

interface VoiceForm {
  writingExamples: string[];
  brandGlossary: string[];
  antiPatterns: string[];
  typicalStructure: string;
  doWords: string[];
  dontWords: string[];
}

interface Props {
  projectId: string;
  isScraping: boolean;
  wasAutoFilled: boolean;
  scrapeFailed: boolean;
  onRescan: () => void;
  rescraping: boolean;
}

function StringListEditor({
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
            <div key={`${label}-${index}`} className="flex gap-2">
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

export function ProjectVoiceTab({
  projectId,
  isScraping,
  wasAutoFilled,
  scrapeFailed,
  onRescan,
  rescraping,
}: Props) {
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
    const payload = {
      writingExamples: form.writingExamples.map((s) => s.trim()).filter(Boolean),
      brandGlossary: form.brandGlossary.map((s) => s.trim()).filter(Boolean),
      antiPatterns: form.antiPatterns.map((s) => s.trim()).filter(Boolean),
      typicalStructure: form.typicalStructure.trim(),
      doWords: form.doWords.map((s) => s.trim()).filter(Boolean),
      dontWords: form.dontWords.map((s) => s.trim()).filter(Boolean),
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
    const examples = form.writingExamples.map((s) => s.trim()).filter(Boolean);
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
    <div className="paper-card p-6 rounded-xl space-y-6">
      <ScrapeStatusHeader
        title="Brand Voice"
        description="Customize how our AI writes content to match your unique brand voice and style."
        isScraping={isScraping}
        wasAutoFilled={wasAutoFilled}
        scrapeFailed={scrapeFailed}
        onRescan={onRescan}
        rescraping={rescraping}
      />

      {isScraping ? (
        <ScrapeFormSkeleton />
      ) : (
        <div className="space-y-6">
          <BrandVoiceSkillEditor projectId={projectId} />

          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Upload writing samples</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste text or upload .txt / .md files. Samples are chunked and indexed for topic-aware retrieval.
              </p>
            </div>
            <Textarea
              value={pasteSample}
              onChange={(e) => setPasteSample(e.target.value)}
              placeholder="Paste an article, email, or landing page copy (min 80 characters)…"
              rows={4}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading || pasteSample.trim().length < 80}
                onClick={() => uploadSamples()}
              >
                {uploading ? <Spinner size="sm" className="mr-1.5" /> : null}
                Index pasted text
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById(`brand-voice-upload-${projectId}`)?.click()}
              >
                {uploading ? "Uploading…" : "Upload files"}
              </Button>
              <input
                id={`brand-voice-upload-${projectId}`}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void uploadSamples(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Writing Examples</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add 3–5 samples of your best writing so the AI can learn your style.
                </p>
              </div>
              {form.writingExamples.length > 0 && (
                <Badge variant="muted" className="shrink-0">
                  {form.writingExamples.length}/{MAX_WRITING_EXAMPLES}
                </Badge>
              )}
            </div>

            {form.writingExamples.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  Paste blog posts, emails, or landing page copy you are proud of.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={appendWritingExample}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add first sample
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {form.writingExamples.map((sample, index) => (
                  <div key={`sample-${index}`} className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Sample {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeWritingExample(index)}
                        aria-label={`Remove sample ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={sample}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          writingExamples: p.writingExamples.map((s, i) =>
                            i === index ? e.target.value : s,
                          ),
                        }))
                      }
                      placeholder="Paste a writing sample here…"
                      className="min-h-[120px] resize-y"
                      rows={4}
                    />
                  </div>
                ))}
              </div>
            )}

            {form.writingExamples.length > 0 &&
              form.writingExamples.length < MAX_WRITING_EXAMPLES && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={appendWritingExample}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add another sample
                </Button>
              )}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={analyzeExamples}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Spinner size="sm" className="mr-2" /> Analyzing...
              </>
            ) : (
              "Analyze Examples"
            )}
          </Button>

          <StringListEditor
            label="Brand Glossary"
            description="Words and phrases you commonly use in your content."
            emptyDescription="Add product names, branded terms, or phrases your team uses consistently."
            placeholder="Enter a term…"
            addFirstLabel="Add first term"
            addAnotherLabel="Add another term"
            maxItems={MAX_VOICE_TERMS}
            values={form.brandGlossary}
            onChange={(brandGlossary) => setForm((p) => ({ ...p, brandGlossary }))}
          />

          <StringListEditor
            label="Anti-patterns"
            description="Words and phrases you never want to appear in your content."
            emptyDescription="List clichés, buzzwords, or off-brand language to block."
            placeholder="Enter a term to avoid…"
            addFirstLabel="Add first term"
            addAnotherLabel="Add another term"
            maxItems={MAX_VOICE_TERMS}
            values={form.antiPatterns}
            onChange={(antiPatterns) => setForm((p) => ({ ...p, antiPatterns }))}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">Typical Structure</p>
            <p className="text-xs text-muted-foreground">
              Describe your typical content structure (e.g., &quot;Hook → Problem → Solution →
              CTA&quot;).
            </p>
            <Input
              placeholder="Hook → Problem → Solution → CTA"
              value={form.typicalStructure}
              onChange={(e) => setForm((p) => ({ ...p, typicalStructure: e.target.value }))}
            />
          </div>

          <StringListEditor
            label="Preferred Words"
            description="Words you like to use in your content."
            emptyDescription="Add words that match your brand tone and voice."
            placeholder="Enter a preferred word…"
            addFirstLabel="Add first word"
            addAnotherLabel="Add another word"
            maxItems={MAX_VOICE_TERMS}
            values={form.doWords}
            onChange={(doWords) => setForm((p) => ({ ...p, doWords }))}
          />

          <StringListEditor
            label="Words to Avoid"
            description="Words you don't want to use in your content."
            emptyDescription="Add words that feel off-brand or you want the AI to skip."
            placeholder="Enter a word to avoid…"
            addFirstLabel="Add first word"
            addAnotherLabel="Add another word"
            maxItems={MAX_VOICE_TERMS}
            values={form.dontWords}
            onChange={(dontWords) => setForm((p) => ({ ...p, dontWords }))}
          />

          <div className="flex items-center gap-3">
            <Button onClick={saveVoice} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save brand voice
                </>
              )}
            </Button>
            {saved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Saved successfully
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
