import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, AlertCircle, Shuffle, CheckCircle2, Circle } from "lucide-react";
import { type ContentFormatType } from "@/lib/publishing-destinations";
import { API_BASE, ALL_FORMATS, FORMAT_META, type ContentPiece } from "./content-piece-types";

type RepurposeStep = "analyzing" | "generating" | "saving";

const REPURPOSE_STEPS: { key: RepurposeStep; label: string }[] = [
  { key: "analyzing", label: "Analyzing source content" },
  { key: "generating", label: "Generating repurposed content" },
  { key: "saving", label: "Saving new piece" },
];

export function RepurposeDialog({
  open,
  onClose,
  piece,
  token,
}: {
  open: boolean;
  onClose: () => void;
  piece: ContentPiece;
  token: string | null;
}) {
  const navigate = useNavigate();
  const [targetFormat, setTargetFormat] = useState<ContentFormatType | "">("");
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<RepurposeStep>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = () => {
    setTargetFormat("");
    setError(null);
    setIsRepurposing(false);
    setCompletedSteps(new Set());
  };

  const handleClose = () => {
    abortRef.current?.abort();
    reset();
    onClose();
  };

  const handleRepurpose = async () => {
    if (!targetFormat) return;
    setIsRepurposing(true);
    setCompletedSteps(new Set());
    setError(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${piece.id}/repurpose/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetFormat }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Repurpose failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace("event:", "").trim();
          const payload = JSON.parse(dataLine.replace("data:", "").trim()) as Record<string, unknown>;

          if (eventType === "step") {
            const step = payload.step as RepurposeStep;
            setCompletedSteps((prev) => new Set([...prev, step]));
          } else if (eventType === "done") {
            const newPiece = payload as unknown as ContentPiece;
            handleClose();
            navigate(`/content-piece/${newPiece.id}`);
            return;
          } else if (eventType === "error") {
            throw new Error((payload.error as string) ?? "Repurpose failed");
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Failed to repurpose content");
        setIsRepurposing(false);
      }
    }
  };

  const otherFormats = ALL_FORMATS.filter((f) => f !== piece.formatType);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="w-4 h-4" />
            Repurpose Content
          </DialogTitle>
          <DialogDescription>
            Convert this {FORMAT_META[piece.formatType].label} into a different format. A new content piece will be created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Target format</Label>
            <Select value={targetFormat} onValueChange={(v) => setTargetFormat(v as ContentFormatType)} disabled={isRepurposing}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a format…" />
              </SelectTrigger>
              <SelectContent>
                {otherFormats.map((f) => {
                  const meta = FORMAT_META[f];
                  const Icon = meta.icon;
                  return (
                    <SelectItem key={f} value={f}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The AI will adapt this content's key insights and messaging into the chosen format.
            </p>
          </div>

          {isRepurposing && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wide mb-2">
                Repurposing…
              </p>
              {REPURPOSE_STEPS.map(({ key, label }) => {
                const done = completedSteps.has(key);
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 animate-pulse" />
                    )}
                    <span className={done ? "text-foreground" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleRepurpose}
              disabled={!targetFormat || isRepurposing}
              className="flex-1"
            >
              {isRepurposing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Repurposing…</>
              ) : (
                <><Shuffle className="w-4 h-4 mr-2" />Repurpose</>
              )}
            </Button>
            <Button variant="outline" onClick={handleClose} disabled={isRepurposing}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
