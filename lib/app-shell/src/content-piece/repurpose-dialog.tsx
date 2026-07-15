import { useState } from "react";
import { AlertCircle, CheckCircle2, Circle, Loader2, Shuffle, X } from "lucide-react";
import { STUDIO_FORMAT_OPTIONS } from "../studio/types";

type RepurposeStep = "analyzing" | "generating" | "saving";

const REPURPOSE_STEPS: { key: RepurposeStep; label: string }[] = [
  { key: "analyzing", label: "Analyzing source content" },
  { key: "generating", label: "Generating repurposed content" },
  { key: "saving", label: "Saving new piece" },
];

export function ContentPieceRepurposeDialog({
  open,
  onClose,
  pieceId,
  currentFormat,
  onRepurpose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  pieceId: number;
  currentFormat: string;
  onRepurpose: (targetFormat: string) => Promise<{ id: number }>;
  onSuccess: (newPieceId: number) => void;
}) {
  const [targetFormat, setTargetFormat] = useState("");
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<RepurposeStep>>(new Set());
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const otherFormats = STUDIO_FORMAT_OPTIONS.filter((option) => option.value !== currentFormat);
  const currentLabel =
    STUDIO_FORMAT_OPTIONS.find((option) => option.value === currentFormat)?.label ?? currentFormat;

  function reset() {
    setTargetFormat("");
    setError(null);
    setIsRepurposing(false);
    setCompletedSteps(new Set());
  }

  function handleClose() {
    if (isRepurposing) return;
    reset();
    onClose();
  }

  async function handleRepurpose() {
    if (!targetFormat) return;
    setIsRepurposing(true);
    setCompletedSteps(new Set(["analyzing"]));
    setError(null);
    try {
      setCompletedSteps(new Set(["analyzing", "generating"]));
      const piece = await onRepurpose(targetFormat);
      setCompletedSteps(new Set(["analyzing", "generating", "saving"]));
      reset();
      onClose();
      onSuccess(piece.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to repurpose content");
      setIsRepurposing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="paper-card w-full max-w-lg rounded-xl p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repurpose-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="repurpose-title" className="flex items-center gap-2 text-lg font-semibold">
              <Shuffle className="h-4 w-4" aria-hidden />
              Repurpose content
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Convert this {currentLabel} into a different format. A new content piece will be
              created.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            onClick={handleClose}
            disabled={isRepurposing}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Target format</span>
            <select
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={targetFormat}
              onChange={(event) => setTargetFormat(event.target.value)}
              disabled={isRepurposing}
            >
              <option value="">Choose a format…</option>
              {otherFormats.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </label>

          {isRepurposing ? (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Repurposing…
              </p>
              {REPURPOSE_STEPS.map(({ key, label }) => {
                const done = completedSteps.has(key);
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 animate-pulse text-muted-foreground/40" aria-hidden />
                    )}
                    <span className={done ? "text-foreground" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={!targetFormat || isRepurposing}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={() => void handleRepurpose()}
            >
              {isRepurposing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Repurposing…
                </>
              ) : (
                <>
                  <Shuffle className="h-4 w-4" aria-hidden />
                  Repurpose
                </>
              )}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              onClick={handleClose}
              disabled={isRepurposing}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
