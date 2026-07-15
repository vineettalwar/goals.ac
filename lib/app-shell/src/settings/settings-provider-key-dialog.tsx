import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, X, XCircle } from "lucide-react";

export type ProviderKeyDialogConfig = {
  providerLabel: string;
  inputId: string;
  dialogTitleId: string;
  placeholder: string;
  helpText: string;
  helpUrl: string;
  helpLinkLabel: string;
  removeConfirmMessage: string;
  permissionMessage: string;
};

export function SettingsProviderKeyDialog({
  open,
  onOpenChange,
  hasKey,
  lastFour,
  onSave,
  onDelete,
  onTest,
  canManage,
  saving = false,
  deleting = false,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasKey: boolean;
  lastFour: string | null;
  onSave: (key: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onTest: (key: string) => Promise<{ ok: boolean; error?: string }>;
  canManage: boolean;
  saving?: boolean;
  deleting?: boolean;
  config: ProviderKeyDialogConfig;
}) {
  const [keyInput, setKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setKeyInput("");
      setTestResult(null);
      setTestError(null);
    }
  }, [open]);

  if (!open) return null;

  const busy = saving || deleting || testing;

  function close() {
    if (busy) return;
    onOpenChange(false);
  }

  async function handleTest() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const result = await onTest(trimmed);
      if (result.ok) {
        setTestResult("ok");
      } else {
        setTestResult("error");
        setTestError(result.error ?? "Key validation failed");
      }
    } catch (err) {
      setTestResult("error");
      setTestError(err instanceof Error ? err.message : "Key validation failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    await onSave(trimmed);
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!window.confirm(config.removeConfirmMessage)) return;
    await onDelete();
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={config.dialogTitleId}
        className="paper-card relative z-10 w-full max-w-md p-6 shadow-lg"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id={config.dialogTitleId} className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden />
            {hasKey ? `Replace ${config.providerLabel} API Key` : `Add ${config.providerLabel} API Key`}
          </h2>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close dialog"
            onClick={close}
            disabled={busy}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {!canManage ? (
          <p className="text-sm text-muted-foreground">{config.permissionMessage}</p>
        ) : (
          <div className="space-y-4">
            {hasKey ? (
              <p className="text-sm text-muted-foreground">
                Current key ending in ••••{lastFour ?? "••••"} will be replaced.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor={config.inputId} className="text-sm font-medium">
                API key
              </label>
              <input
                id={config.inputId}
                type="password"
                value={keyInput}
                onChange={(event) => {
                  setKeyInput(event.target.value);
                  setTestResult(null);
                  setTestError(null);
                }}
                placeholder={config.placeholder}
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                {config.helpText}{" "}
                <a
                  href={config.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {config.helpLinkLabel}
                </a>
                . Your key is encrypted with AES-256 before storage.
              </p>
            </div>

            {testResult === "ok" ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                Key is valid and working
              </div>
            ) : null}
            {testResult === "error" ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <span>{testError ?? "Key validation failed"}</span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={!keyInput.trim() || busy}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
                    Testing…
                  </>
                ) : (
                  "Test key"
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!keyInput.trim() || busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save key"
                )}
              </button>
              {hasKey ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={busy}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? "Removing…" : "Remove key"}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
