import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, Shuffle, KeyRound } from "lucide-react";
import { safeJson } from "@/lib/safe-json";
import {
  API_BASE,
  type ContentFormatType,
  type ContentPiece,
  type LinkedInArchetypeId,
  type LinkedInHookId,
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
  FORMAT_META,
  FORMAT_CATEGORIES,
  CALENDAR_WEEK_DAYS,
  extractSections,
} from "./content-studio-types";

export function CreateModal({
  open,
  onClose,
  onCreated,
  projectId,
  token,
  hasGeminiKey,
  pieces,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (piece: ContentPiece) => void;
  projectId: string;
  token: string | null;
  hasGeminiKey?: boolean;
  pieces?: ContentPiece[];
}) {
  const [step, setStep] = useState<"format" | "details" | "repurpose">(
    "format",
  );
  const [selectedFormat, setSelectedFormat] =
    useState<ContentFormatType | null>(null);
  const [keyword, setKeyword] = useState("");
  const [angleHint, setAngleHint] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isCachedResult, setIsCachedResult] = useState(false);
  const bypassCacheRef = useRef(false);
  const [linkedinArchetype, setLinkedinArchetype] = useState<
    LinkedInArchetypeId | undefined
  >(undefined);
  const [linkedinHook, setLinkedinHook] = useState<LinkedInHookId | undefined>(
    undefined,
  );
  const _cachedPiece = useRef<Omit<ContentPiece, "source"> | null>(null);
  const [, setStreamPreview] = useState("");
  const [detectedSections, setDetectedSections] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [repurposeFormat, setRepurposeFormat] = useState<
    ContentFormatType | ""
  >("");
  const [repurposeKeyword, setRepurposeKeyword] = useState("");
  const [repurposeContent, setRepurposeContent] = useState("");
  const [repurposeSource, setRepurposeSource] = useState<"paste" | "existing">(
    "paste",
  );
  const [repurposeSelectedId, setRepurposeSelectedId] = useState<number | null>(
    null,
  );

  const reset = () => {
    setStep("format");
    setSelectedFormat(null);
    setKeyword("");
    setAngleHint("");
    setLinkedinArchetype(undefined);
    setLinkedinHook(undefined);
    setError(null);
    setIsGenerating(false);
    setStreamPreview("");
    setDetectedSections([]);
    setRepurposeFormat("");
    setRepurposeKeyword("");
    setRepurposeContent("");
    setRepurposeSource("paste");
    setRepurposeSelectedId(null);
    setIsDone(false);
    setIsCachedResult(false);
    bypassCacheRef.current = false;
    _cachedPiece.current = null;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGenerateFallback = async (useBypass = false): Promise<void> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (useBypass) headers["x-bypass-cache"] = "true";
    const res = await fetch(
      `${API_BASE}/api/website-projects/${projectId}/content-pieces/generate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          formatType: selectedFormat,
          targetKeyword: keyword.trim(),
          angleHint:
            selectedFormat === "linkedin_post"
              ? `archetype:${linkedinArchetype || ""}|hook:${linkedinHook || ""}|${angleHint.trim() || ""}`
              : angleHint.trim() || undefined,
        }),
      },
    );
    if (!res.ok) {
      const data = await safeJson<{ error?: string }>(res);
      throw new Error(data?.error ?? "Failed to generate content piece");
    }
    const newPiece = await safeJson<Omit<ContentPiece, "source">>(res);
    if (!newPiece) throw new Error("Failed to generate content piece");
    onCreated({ ...newPiece, source: "studio" });
    handleClose();
  };

  const handleGenerate = async (forceBypass = false) => {
    if (!selectedFormat || !keyword.trim()) return;
    const useBypass = forceBypass || bypassCacheRef.current;
    setIsGenerating(true);
    setIsCachedResult(false);
    setStreamPreview("");
    setDetectedSections([]);
    setError(null);
    try {
      let res: Response;
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };
        if (useBypass) headers["x-bypass-cache"] = "true";
        res = await fetch(
          `${API_BASE}/api/website-projects/${projectId}/content-pieces/generate/stream`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              formatType: selectedFormat,
              targetKeyword: keyword.trim(),
              angleHint:
                selectedFormat === "linkedin_post"
                  ? `archetype:${linkedinArchetype || ""}|hook:${linkedinHook || ""}|${angleHint.trim() || ""}`
                  : angleHint.trim() || undefined,
            }),
          },
        );
      } catch {
        await handleGenerateFallback(useBypass);
        return;
      }

      if (!res.ok || !res.body) {
        await handleGenerateFallback(useBypass);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let jsonAccumulated = "";
      let finalPiece: Omit<ContentPiece, "source"> | null = null;
      let fromCache = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: chunk")) continue;
          if (line.startsWith("event: done")) continue;
          if (line.startsWith("event: cached")) {
            fromCache = true;
            continue;
          }
          if (line.startsWith("event: error")) {
            throw new Error("Generation failed");
          }
          if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            try {
              const parsed = JSON.parse(raw) as
                | { text?: string }
                | Omit<ContentPiece, "source">;
              if ("text" in parsed && parsed.text) {
                jsonAccumulated += (parsed as { text: string }).text;
                const sections = extractSections(jsonAccumulated);
                if (sections.length > 0) {
                  setDetectedSections(sections);
                } else if (jsonAccumulated.length > 30) {
                  setDetectedSections(["Crafting title\u2026"]);
                }
              } else if ("id" in parsed) {
                finalPiece = parsed as Omit<ContentPiece, "source">;
              }
            } catch {
              /* partial JSON, skip */
            }
          }
        }
      }

      if (finalPiece) {
        if (fromCache) {
          _cachedPiece.current = finalPiece;
          setIsCachedResult(true);
          setIsDone(true);
        } else {
          setIsDone(true);
          await new Promise((resolve) => setTimeout(resolve, 900));
          onCreated({ ...finalPiece, source: "studio" });
          handleClose();
        }
      } else {
        throw new Error("Generation completed without result");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate content",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRepurpose = async () => {
    if (
      !repurposeFormat ||
      !repurposeKeyword.trim() ||
      !repurposeContent.trim()
    )
      return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/website-projects/${projectId}/content-pieces/repurpose`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetFormat: repurposeFormat,
            existingContent: repurposeContent.trim(),
            targetKeyword: repurposeKeyword.trim(),
          }),
        },
      );
      if (!res.ok) {
        const data = await safeJson<{ error?: string }>(res);
        throw new Error(data?.error ?? "Generation failed");
      }
      const newPiece = await safeJson<Omit<ContentPiece, "source">>(res);
      if (!newPiece) throw new Error("Generation failed");
      onCreated({ ...newPiece, source: "studio" });
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to repurpose content",
      );
    } finally {
      setIsGenerating(false);
    }
  };

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
                      <button type="button"
                        key={type}
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
                            <span className="font-medium text-sm">
                              {meta.label}
                            </span>
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
              <button type="button"
                onClick={() => setStep("repurpose")}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="p-1.5 rounded-md bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400">
                    <Shuffle className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-medium text-sm">
                    Repurpose Existing Content
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Paste any existing content and convert it into a different
                  format — blog post to LinkedIn thread, guide to email
                  sequence, and more.
                </p>
              </button>
            </div>
          </div>
        )}

        {step === "details" && selectedFormat && (
          <div className="space-y-5 mt-2">
            <button type="button"
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
              <span className="text-sm font-medium">
                {FORMAT_META[selectedFormat].label}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyword">
                Target keyword <span className="text-destructive">*</span>
              </Label>
              <Input
                id="keyword"
                placeholder="e.g. local SEO for startups"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                The primary keyword this content should rank for.
              </p>
            </div>

            {selectedFormat === "linkedin_post" ? (
              <>
                <div className="space-y-4">
                  <Label htmlFor="linkedin-archetype">
                    Content Archetype{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </Label>
                  <Select
                    value={linkedinArchetype}
                    onValueChange={(v) =>
                      setLinkedinArchetype(v as LinkedInArchetypeId)
                    }
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="linkedin-archetype">
                      <SelectValue placeholder="Choose archetype…" />
                    </SelectTrigger>
                    <SelectContent>
                      {LINKEDIN_ARCHETYPES.map((archetype) => (
                        <SelectItem key={archetype.id} value={archetype.id}>
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {archetype.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {archetype.description}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose a content structure archetype for your LinkedIn post.
                  </p>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="linkedin-hook">
                    Hook Type{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </Label>
                  <Select
                    value={linkedinHook}
                    onValueChange={(v) => setLinkedinHook(v as LinkedInHookId)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="linkedin-hook">
                      <SelectValue placeholder="Choose hook type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {LINKEDIN_HOOK_TYPES.map((hook) => (
                        <SelectItem key={hook.id} value={hook.id}>
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {hook.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {hook.template}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a hook type that will stop scroll in the LinkedIn
                    feed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="angle">
                    Additional Context{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="angle"
                    placeholder="e.g. Focus on e-commerce brands, include a case study"
                    value={angleHint}
                    onChange={(e) => setAngleHint(e.target.value)}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add any specific angle or context you want the AI to
                    consider.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="angle">
                  Title hint or angle{" "}
                  <span className="text-muted-foreground text-xs">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="angle"
                  placeholder="e.g. Focus on e-commerce brands, include a case study"
                  value={angleHint}
                  onChange={(e) => setAngleHint(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">
                  Give the AI a specific angle or title direction.
                </p>
              </div>
            )}

            {isDone && !isCachedResult && (
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/50 p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Done! Opening your content piece…
              </div>
            )}

            {isDone && isCachedResult && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  This piece already exists — returning the cached version.
                </div>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/70">
                  Same format, keyword, and brand settings were used before. You
                  can open it or regenerate a fresh version.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (_cachedPiece.current) {
                        onCreated({
                          ..._cachedPiece.current,
                          source: "studio",
                        });
                        handleClose();
                      }
                    }}
                  >
                    Open existing piece
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsDone(false);
                      setIsCachedResult(false);
                      handleGenerate(true);
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Regenerate
                  </Button>
                </div>
              </div>
            )}

            {isGenerating && !isDone && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">
                    Writing your {FORMAT_META[selectedFormat].label}…
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {FORMAT_META[selectedFormat].wordRange} words
                  </span>
                </div>
                <div className="px-3 py-2.5 space-y-1.5 max-h-40 overflow-y-auto">
                  {detectedSections.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                      Starting…
                    </div>
                  ) : (
                    <>
                      {detectedSections.slice(0, -1).map((sec, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                          {sec}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                        {detectedSections[detectedSections.length - 1]}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={() => handleGenerate()}
              disabled={!keyword.trim() || isGenerating || isDone}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                  {hasGeminiKey && (
                    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-xs font-medium">
                      <KeyRound className="h-3 w-3" />
                      Using your API key
                    </span>
                  )}
                </>
              ) : (
                <>Generate {FORMAT_META[selectedFormat].label}</>
              )}
            </Button>
          </div>
        )}

        {step === "repurpose" && (
          <div className="space-y-5 mt-2">
            <button type="button"
              onClick={() => setStep("format")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to format selection
            </button>

            <div className="flex items-center gap-2 p-3 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-lg border border-fuchsia-200 dark:border-fuchsia-800/50">
              <Shuffle className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
              <span className="text-sm font-medium text-fuchsia-900 dark:text-fuchsia-300">
                Repurpose Existing Content
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repurpose-format">
                Convert to format <span className="text-destructive">*</span>
              </Label>
              <Select
                value={repurposeFormat}
                onValueChange={(v) =>
                  setRepurposeFormat(v as ContentFormatType)
                }
                disabled={isGenerating}
              >
                <SelectTrigger id="repurpose-format">
                  <SelectValue placeholder="Choose target format…" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(FORMAT_META) as [
                      ContentFormatType,
                      (typeof FORMAT_META)[ContentFormatType],
                    ][]
                  ).map(([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repurpose-keyword">
                Target keyword <span className="text-destructive">*</span>
              </Label>
              <Input
                id="repurpose-keyword"
                placeholder="e.g. B2B content strategy"
                value={repurposeKeyword}
                onChange={(e) => setRepurposeKeyword(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 rounded-lg border border-border overflow-hidden text-sm">
                <button type="button"
                  className={`flex-1 px-3 py-1.5 transition-colors ${repurposeSource === "paste" ? "bg-primary text-primary-foreground font-medium" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setRepurposeSource("paste")}
                  disabled={isGenerating}
                >
                  Paste content
                </button>
                <button type="button"
                  className={`flex-1 px-3 py-1.5 transition-colors ${repurposeSource === "existing" ? "bg-primary text-primary-foreground font-medium" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setRepurposeSource("existing")}
                  disabled={isGenerating}
                >
                  Select from library
                </button>
              </div>

              {repurposeSource === "paste" ? (
                <>
                  <Textarea
                    id="repurpose-content"
                    placeholder="Paste your existing blog post, guide, article, or any content here…"
                    value={repurposeContent}
                    onChange={(e) => setRepurposeContent(e.target.value)}
                    disabled={isGenerating}
                    rows={7}
                    className="text-sm resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI will adapt this content's core insights into the
                    chosen format.
                  </p>
                </>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {!pieces || pieces.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-4 text-center">
                      No content pieces in this project yet.
                    </p>
                  ) : (
                    pieces.map((p) => {
                      const meta = FORMAT_META[p.formatType];
                      const Icon = meta?.icon;
                      const isSelected = repurposeSelectedId === p.id;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            setRepurposeSelectedId(p.id);
                            setRepurposeContent(p.bodyMarkdown);
                          }}
                          disabled={isGenerating}
                          className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors ${isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/50"}`}
                        >
                          {Icon && (
                            <Icon
                              className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${meta.color.split(" ")[0]}`}
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {p.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {meta?.label} · {p.wordCount} words
                            </p>
                          </div>
                          {isSelected && (
                            <svg
                              className="w-4 h-4 ml-auto shrink-0 text-primary mt-0.5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleRepurpose}
              disabled={
                !repurposeFormat ||
                !repurposeKeyword.trim() ||
                repurposeContent.trim().length < 50 ||
                isGenerating
              }
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Repurposing content…
                  {hasGeminiKey && (
                    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-xs font-medium">
                      <KeyRound className="h-3 w-3" />
                      Using your API key
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Repurpose Content
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
