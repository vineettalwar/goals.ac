"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Shuffle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FORMAT_CATEGORIES,
  FORMAT_META,
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
  type ContentFormatType,
  type LinkedInArchetypeId,
  type LinkedInHookId,
} from "./content-studio-format-meta";
import type { ContentPieceRow } from "./content-studio-client";

type Step = "format" | "details" | "repurpose";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingPieces: ContentPieceRow[];
  onCreated: (piece: ContentPieceRow) => void;
}

export function CreateContentModal({ open, onClose, projectId, existingPieces, onCreated }: Props) {
  const [step, setStep] = useState<Step>("format");
  const [selectedFormat, setSelectedFormat] = useState<ContentFormatType | null>(null);
  const [keyword, setKeyword] = useState("");
  const [angleHint, setAngleHint] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [linkedinArchetype, setLinkedinArchetype] = useState<LinkedInArchetypeId | "">("");
  const [linkedinHook, setLinkedinHook] = useState<LinkedInHookId | "">("");
  const [bypassCache, setBypassCache] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamPreview, setStreamPreview] = useState("");

  const [repurposeFormat, setRepurposeFormat] = useState<ContentFormatType>("linkedin_post");
  const [repurposeKeyword, setRepurposeKeyword] = useState("");
  const [repurposeContent, setRepurposeContent] = useState("");
  const [sourcePieceId, setSourcePieceId] = useState("");

  function reset() {
    setStep("format");
    setSelectedFormat(null);
    setKeyword("");
    setAngleHint("");
    setPlannedDate("");
    setLinkedinArchetype("");
    setLinkedinHook("");
    setBypassCache(false);
    setStreamPreview("");
    setRepurposeFormat("linkedin_post");
    setRepurposeKeyword("");
    setRepurposeContent("");
    setSourcePieceId("");
  }

  function handleClose() {
    if (generating) return;
    reset();
    onClose();
  }

  function buildAngleHint(format: ContentFormatType): string | undefined {
    if (format === "linkedin_post") {
      return `archetype:${linkedinArchetype || ""}|hook:${linkedinHook || ""}|${angleHint.trim() || ""}`;
    }
    return angleHint.trim() || undefined;
  }

  async function handleGenerateFallback(): Promise<ContentPieceRow> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bypassCache) headers["x-bypass-cache"] = "true";

    const res = await fetch(`/api/website-projects/${projectId}/content-pieces`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        formatType: selectedFormat,
        targetKeyword: keyword.trim(),
        angleHint: buildAngleHint(selectedFormat!),
        plannedDate: plannedDate || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Generation failed");
    }

    const piece = await res.json();
    return piece as ContentPieceRow;
  }

  async function handleGenerate() {
    if (!selectedFormat || !keyword.trim()) {
      toast.error("Enter a target keyword");
      return;
    }
    setGenerating(true);
    setStreamPreview("");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bypassCache) headers["x-bypass-cache"] = "true";

    const payload = {
      formatType: selectedFormat,
      targetKeyword: keyword.trim(),
      angleHint: buildAngleHint(selectedFormat),
      plannedDate: plannedDate || undefined,
    };

    try {
      let res: Response;
      try {
        res = await fetch(`/api/website-projects/${projectId}/content-pieces/generate/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      } catch {
        const piece = await handleGenerateFallback();
        onCreated(piece);
        toast.success("Content generated");
        handleClose();
        return;
      }

      if (!res.ok || !res.body) {
        const piece = await handleGenerateFallback();
        onCreated(piece);
        toast.success("Content generated");
        handleClose();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalPiece: ContentPieceRow | null = null;
      let fromCache = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: cached")) {
            fromCache = true;
            continue;
          }
          if (line.startsWith("event: error")) {
            throw new Error("Generation failed");
          }
          if (!line.startsWith("data: ")) continue;

          try {
            const parsed = JSON.parse(line.slice(6)) as { text?: string } | ContentPieceRow;
            if ("text" in parsed && parsed.text) {
              setStreamPreview((p) => p + parsed.text);
            } else if ("id" in parsed) {
              finalPiece = parsed as ContentPieceRow;
            }
          } catch {
            // partial JSON during streaming
          }
        }
      }

      if (finalPiece) {
        onCreated(finalPiece);
        toast.success(fromCache ? "Loaded cached content" : "Content generated");
        handleClose();
        return;
      }

      throw new Error("Generation completed without a result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRepurpose() {
    if (!repurposeKeyword.trim() || repurposeContent.trim().length < 50) {
      toast.error("Enter a keyword and at least 50 characters of source content");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/content-pieces/repurpose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetFormat: repurposeFormat,
          targetKeyword: repurposeKeyword.trim(),
          existingContent: repurposeContent.trim(),
        }),
      });
      if (!res.ok) throw new Error("Repurpose failed");
      const piece = await res.json();
      onCreated(piece);
      toast.success("Repurposed content created");
      handleClose();
    } catch {
      toast.error("Repurpose failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
          <DialogDescription>
            {step === "format"
              ? "Choose a content format to generate."
              : step === "repurpose"
                ? "Repurpose existing content into a new format."
                : "Configure your content piece."}
          </DialogDescription>
        </DialogHeader>

        {step === "format" && (
          <div className="space-y-5 mt-2">
            {FORMAT_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {cat.label}
                  </span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.formats.map((type) => {
                    const meta = FORMAT_META[type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSelectedFormat(type);
                          setStep("details");
                        }}
                        className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-md ${meta.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-medium text-sm">{meta.label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                            {meta.wordRange}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {meta.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Repurpose
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <button
                type="button"
                onClick={() => setStep("repurpose")}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="p-1.5 rounded-md bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400">
                    <Shuffle className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-medium text-sm">Repurpose Existing Content</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Paste any existing content and convert it into a different format.
                </p>
              </button>
            </div>
          </div>
        )}

        {step === "details" && selectedFormat && (
          <div className="space-y-5 mt-2">
            <button
              type="button"
              onClick={() => setStep("format")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to format selection
            </button>

            <div className="flex items-center gap-2 p-3 bg-accent/40 rounded-lg">
              {(() => {
                const Icon = FORMAT_META[selectedFormat].icon;
                return <Icon className="w-4 h-4 text-muted-foreground" />;
              })()}
              <span className="text-sm font-medium">{FORMAT_META[selectedFormat].label}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyword">Target keyword <span className="text-destructive">*</span></Label>
              <Input
                id="keyword"
                placeholder="e.g. local SEO for startups"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={generating}
              />
            </div>

            {selectedFormat === "linkedin_post" && (
              <>
                <div className="space-y-2">
                  <Label>Content archetype (optional)</Label>
                  <Select value={linkedinArchetype} onValueChange={(v) => setLinkedinArchetype(v as LinkedInArchetypeId)}>
                    <SelectTrigger><SelectValue placeholder="Choose archetype…" /></SelectTrigger>
                    <SelectContent>
                      {LINKEDIN_ARCHETYPES.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.label} — {a.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hook type (optional)</Label>
                  <Select value={linkedinHook} onValueChange={(v) => setLinkedinHook(v as LinkedInHookId)}>
                    <SelectTrigger><SelectValue placeholder="Choose hook…" /></SelectTrigger>
                    <SelectContent>
                      {LINKEDIN_HOOK_TYPES.map((h) => (
                        <SelectItem key={h.id} value={h.id}>{h.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Angle / instructions (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Specific angle, tone notes, or context…"
                value={angleHint}
                onChange={(e) => setAngleHint(e.target.value)}
                disabled={generating}
              />
            </div>

            <div className="space-y-2">
              <Label>Planned date (optional)</Label>
              <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} disabled={generating} />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={bypassCache} onChange={(e) => setBypassCache(e.target.checked)} />
              Bypass cache (force fresh generation)
            </label>

            {generating && streamPreview && (
              <div className="rounded-lg border bg-secondary/30 p-4 max-h-48 overflow-y-auto text-sm whitespace-pre-wrap font-mono">
                {streamPreview}
                <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
              </div>
            )}

            <Button onClick={handleGenerate} disabled={generating || !keyword.trim()} className="w-full sm:w-auto">
              {generating ? <Spinner size="sm" /> : "Generate"}
            </Button>
          </div>
        )}

        {step === "repurpose" && (
          <div className="space-y-5 mt-2">
            <button
              type="button"
              onClick={() => setStep("format")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to format selection
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target format</Label>
                <Select value={repurposeFormat} onValueChange={(v) => setRepurposeFormat(v as ContentFormatType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FORMAT_META).map(([value, meta]) => (
                      <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target keyword</Label>
                <Input
                  value={repurposeKeyword}
                  onChange={(e) => setRepurposeKeyword(e.target.value)}
                  disabled={generating}
                />
              </div>
            </div>

            {existingPieces.length > 0 && (
              <div className="space-y-2">
                <Label>Load from existing piece</Label>
                <Select
                  value={sourcePieceId}
                  onValueChange={(id) => {
                    setSourcePieceId(id);
                    const piece = existingPieces.find((p) => String(p.id) === id);
                    if (piece) {
                      setRepurposeKeyword(piece.targetKeyword);
                      setRepurposeContent(`[${piece.title}]\nKeyword: ${piece.targetKeyword}`);
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Paste content below…" /></SelectTrigger>
                  <SelectContent>
                    {existingPieces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Source content</Label>
              <Textarea
                rows={6}
                placeholder="Paste existing content (min 50 characters)…"
                value={repurposeContent}
                onChange={(e) => setRepurposeContent(e.target.value)}
                disabled={generating}
              />
            </div>

            <Button onClick={handleRepurpose} disabled={generating}>
              {generating ? <Spinner size="sm" /> : "Repurpose"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
