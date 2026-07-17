import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, X, XCircle } from "lucide-react";
import {
  BEDROCK_MODEL_CHOICES,
  BEDROCK_MODEL_CUSTOM,
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

function isFormComplete(form: BedrockCredentialsForm): boolean {
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

  const knownIds = useMemo(() => new Set<string>(BEDROCK_MODEL_CHOICES.map((c) => c.id)), []);
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
      return;
    }
    setForm(emptyBedrockForm(savedModel ?? ""));
    setForceCustomModel(Boolean(savedModel && !knownIds.has(savedModel)));
  }, [open, savedModel, knownIds]);

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
    if (!isFormComplete(form)) return;
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
    if (!isFormComplete(form)) return;
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
              Paste a long-term Bedrock API key and choose the model to use for generation.
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
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Choose a Bedrock model</option>
                {BEDROCK_MODEL_CHOICES.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
                <option value={BEDROCK_MODEL_CUSTOM}>Custom model id…</option>
              </select>
              {showCustom ? (
                <input
                  id="bedrock-model-custom"
                  value={form.model}
                  onChange={(event) => updateForm({ model: event.target.value })}
                  placeholder="e.g. us.anthropic.claude-sonnet-4-20250514-v1:0"
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
                disabled={!isFormComplete(form) || busy}
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
                disabled={!isFormComplete(form) || busy}
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
