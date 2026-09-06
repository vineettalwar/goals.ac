"use client";

import { FileText, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { BrandVoiceSkillEditor } from "@/components/brand/brand-voice-skill-editor";
import { StringListEditor } from "./project-voice-string-list";

const MAX_WRITING_EXAMPLES = 5;
const MAX_VOICE_TERMS = 20;

export interface VoiceForm {
  writingExamples: string[];
  brandGlossary: string[];
  antiPatterns: string[];
  typicalStructure: string;
  doWords: string[];
  dontWords: string[];
}

export function ProjectVoiceForm({
  projectId,
  form,
  setForm,
  pasteSample,
  setPasteSample,
  uploading,
  analyzing,
  saving,
  saved,
  onUploadSamples,
  onAnalyzeExamples,
  onSave,
  appendWritingExample,
  removeWritingExample,
}: {
  projectId: string;
  form: VoiceForm;
  setForm: React.Dispatch<React.SetStateAction<VoiceForm>>;
  pasteSample: string;
  setPasteSample: (v: string) => void;
  uploading: boolean;
  analyzing: boolean;
  saving: boolean;
  saved: boolean;
  onUploadSamples: (files?: FileList | null) => void;
  onAnalyzeExamples: () => void;
  onSave: () => void;
  appendWritingExample: () => void;
  removeWritingExample: (index: number) => void;
}) {
  return (
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
                onClick={() => onUploadSamples()}
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
                aria-label="Upload brand voice files"
                accept=".txt,.md,text/plain,text/markdown"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void onUploadSamples(e.target.files);
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
                  Add 3–5 samples of your best writing so drafts can match your style.
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
                      className="min-h-30 resize-y"
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
            onClick={onAnalyzeExamples}
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

          <div className="grid gap-6 md:grid-cols-2">
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
          </div>

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

          <div className="grid gap-6 md:grid-cols-2">
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
              emptyDescription="Add words that feel off-brand or you want drafts to skip."
              placeholder="Enter a word to avoid…"
              addFirstLabel="Add first word"
              addAnotherLabel="Add another word"
              maxItems={MAX_VOICE_TERMS}
              values={form.dontWords}
              onChange={(dontWords) => setForm((p) => ({ ...p, dontWords }))}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onSave} disabled={saving}>
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
  );
}
