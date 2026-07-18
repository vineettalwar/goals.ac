import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, X, XCircle } from "lucide-react";
import {
  BEDROCK_MODEL_CUSTOM,
  type BedrockModelChoice,
} from "@workspace/ai-providers/bedrock-models";

/** @deprecated No hardcoded Bedrock model — choose a model in the dialog. */
export const DEFAULT_BEDROCK_MODEL = "";

export type BedrockCredentialsForm = {
  apiKey: string;
  model: string;
};

export function emptyBedrockForm(model = ""): BedrockCredentialsForm {
  return { apiKey: "", model };
}

function canSave(form: BedrockCredentialsForm, hasCredentials: boolean): boolean {
  if (!form.model.trim()) return false;
  // Model-only save when org already has a key (API accepts { model } without apiKey).
  return Boolean(form.apiKey.trim()) || hasCredentials;
}

function canTest(form: BedrockCredentialsForm): boolean {
  return Boolean(form.apiKey.trim() && form.model.trim());
}

export function SettingsBedrockDialog({
  open,
  onOpenChange,
  hasCredentials,
  accessKeyLastFour,
  model: savedModel,
  onSave,
  onDelete,
  onTest,
  canManage,
  saving = false,
  deleting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCredentials: boolean;
  accessKeyLastFour: string | null;
  region?: string | null;
  model?: string | null;
  onSave: (form: BedrockCredentialsForm) => Promise<void>;
  onDelete: () => Promise<void>;
  onTest: (form: BedrockCredentialsForm) => Promise<{ ok: boolean; error?: string }>;
  canManage: boolean;
  saving?: boolean;
  deleting?: boolean;
}) {
  const [form, setForm] = useState<BedrockCredentialsForm>(() => emptyBedrockForm(savedModel ?? ""));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [forceCustomModel, setForceCustomModel] = useState(false);
  const [accountModels, setAccountModels] = useState<BedrockModelChoice[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const knownIds = useMemo(() => new Set(accountModels.map((m) => m.id)), [accountModels]);
  const showCustom =
    forceCustomModel ||
    Boolean(form.model && !knownIds.has(form.model));
  const selectValue = showCustom ? BEDROCK_MODEL_CUSTOM : form.model;

  useEffect(() => {
    if (!open) {
      setForm(emptyBedrockForm());
      setTestResult(null);
      setTestError(null);
      setForceCustomModel(false);
      setAccountModels([]);
      setModelsError(null);
      return;
    }
    setForm(emptyBedrockForm(savedModel ?? ""));
  }, [open, savedModel]);

  useEffect(() => {
    if (!open || !canManage) return;
    const trimmed = form.apiKey.trim();
    if (trimmed.length > 0 && trimmed.length < 16) {
      setAccountModels([]);
      setModelsError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setModelsLoading(true);
      setModelsError(null);
      try {
        const res = await fetch("/api/auth/bedrock-credentials/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trimmed.length >= 16 ? { apiKey: trimmed } : {}),
        });
        const data = (await res.json().catch(() => ({}))) as {
          models?: BedrockModelChoice[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setAccountModels([]);
          setModelsError(data.error ?? "Could not load models for this account");
          return;
        }
        const models = data.models ?? [];
        setAccountModels(models);
      } catch {
        if (!cancelled) {
          setAccountModels([]);
          setModelsError("Could not load models for this account");
        }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, canManage, form.apiKey]);

  if (!open) return null;

  const busy = saving || deleting || testing;

  function close() {
    if (busy) return;
    onOpenChange(false);
  }

  function updateForm(patch: Partial<BedrockCredentialsForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
    setTestResult(null);
    setTestError(null);
  }

  async function handleTest() {
    if (!canTest(form)) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const result = await onTest(form);
      if (result.ok) {
        setTestResult("ok");
      } else {
        setTestResult("error");
        setTestError(result.error ?? "Credential validation failed");
      }
    } catch (err) {
      setTestResult("error");
      setTestError(err instanceof Error ? err.message : "Credential validation failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!canSave(form, hasCredentials)) return;
    await onSave(form);
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!window.confirm("Remove the organization AWS Bedrock API key?")) return;
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
        aria-labelledby="bedrock-credentials-dialog-title"
        className="paper-card relative z-10 w-full max-w-lg p-6 shadow-lg"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="bedrock-credentials-dialog-title" className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden />
            {hasCredentials ? "Replace Bedrock API key" : "Add Bedrock API key"}
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
          <p className="text-sm text-muted-foreground">
            Only organization owners and site admins can manage AWS Bedrock credentials.
          </p>
        ) : (
          <div className="space-y-4">
            {hasCredentials ? (
              <p className="text-sm text-muted-foreground">
                Current key ending in ••••{accessKeyLastFour ?? "••••"} will be replaced.
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Paste a long-term Bedrock API key. The model list is loaded from models enabled for
              that AWS account.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="bedrock-api-key" className="text-sm font-medium">
                Bedrock API key
              </label>
              <input
                id="bedrock-api-key"
                type="password"
                value={form.apiKey}
                onChange={(event) => updateForm({ apiKey: event.target.value })}
                placeholder="Paste Bedrock API key"
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bedrock-model" className="text-sm font-medium">
                Model
              </label>
              <select
                id="bedrock-model"
                value={selectValue}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === BEDROCK_MODEL_CUSTOM) {
                    setForceCustomModel(true);
                    if (knownIds.has(form.model)) {
                      updateForm({ model: "" });
                    }
                    return;
                  }
                  setForceCustomModel(false);
                  updateForm({ model: value });
                }}
                disabled={modelsLoading}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">
                  {modelsLoading
                    ? "Loading models…"
                    : accountModels.length === 0
                      ? "Paste API key to load models"
                      : "Choose a Bedrock model"}
                </option>
                {accountModels.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
                <option value={BEDROCK_MODEL_CUSTOM}>Custom model id…</option>
              </select>
              {modelsError ? (
                <p className="text-xs text-muted-foreground">{modelsError}</p>
              ) : null}
              {showCustom ? (
                <input
                  id="bedrock-model-custom"
                  value={form.model}
                  onChange={(event) => updateForm({ model: event.target.value })}
                  placeholder="e.g. amazon.nova-lite-v1:0"
                  autoComplete="off"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              ) : null}
            </div>

            {testResult === "ok" ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                API key is valid and working
              </div>
            ) : null}
            {testResult === "error" ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <span>{testError ?? "Credential validation failed"}</span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={!canTest(form) || busy}
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
                disabled={!canSave(form, hasCredentials) || busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : form.apiKey.trim() ? (
                  "Save key"
                ) : (
                  "Save model"
                )}
              </button>
              {hasCredentials ? (
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
