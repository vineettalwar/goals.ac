import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, X, XCircle } from "lucide-react";

export const DEFAULT_BEDROCK_MODEL = "anthropic.claude-3-5-haiku-20241022-v1:0";

export type BedrockCredentialsForm = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  region: string;
  model: string;
};

export function emptyBedrockForm(region = "us-east-1", model = DEFAULT_BEDROCK_MODEL): BedrockCredentialsForm {
  return {
    accessKeyId: "",
    secretAccessKey: "",
    sessionToken: "",
    region,
    model,
  };
}

function isFormComplete(form: BedrockCredentialsForm): boolean {
  return Boolean(
    form.accessKeyId.trim() &&
      form.secretAccessKey.trim() &&
      form.region.trim() &&
      form.model.trim(),
  );
}

export function SettingsBedrockDialog({
  open,
  onOpenChange,
  hasCredentials,
  accessKeyLastFour,
  region,
  model,
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
  region: string | null;
  model: string | null;
  onSave: (form: BedrockCredentialsForm) => Promise<void>;
  onDelete: () => Promise<void>;
  onTest: (form: BedrockCredentialsForm) => Promise<{ ok: boolean; error?: string }>;
  canManage: boolean;
  saving?: boolean;
  deleting?: boolean;
}) {
  const [form, setForm] = useState<BedrockCredentialsForm>(() =>
    emptyBedrockForm(region ?? "us-east-1", model ?? DEFAULT_BEDROCK_MODEL),
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(emptyBedrockForm(region ?? "us-east-1", model ?? DEFAULT_BEDROCK_MODEL));
      setTestResult(null);
      setTestError(null);
    }
  }, [open, region, model]);

  if (!open) return null;

  const busy = saving || deleting || testing;

  function close() {
    if (busy) return;
    onOpenChange(false);
  }

  function updateField<K extends keyof BedrockCredentialsForm>(key: K, value: BedrockCredentialsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    if (!window.confirm("Remove the organization AWS Bedrock credentials?")) return;
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
            {hasCredentials ? "Replace AWS Bedrock credentials" : "Add AWS Bedrock credentials"}
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
                Current access key ending in ••••{accessKeyLastFour ?? "••••"} will be replaced.
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Credentials are encrypted with AES-256 before storage. Use an IAM user with Bedrock invoke
              permissions.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="bedrock-access-key-id" className="text-sm font-medium">
                Access key ID
              </label>
              <input
                id="bedrock-access-key-id"
                type="password"
                value={form.accessKeyId}
                onChange={(event) => updateField("accessKeyId", event.target.value)}
                placeholder="AKIA..."
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bedrock-secret-access-key" className="text-sm font-medium">
                Secret access key
              </label>
              <input
                id="bedrock-secret-access-key"
                type="password"
                value={form.secretAccessKey}
                onChange={(event) => updateField("secretAccessKey", event.target.value)}
                placeholder="Secret key"
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bedrock-session-token" className="text-sm font-medium">
                Session token (optional)
              </label>
              <input
                id="bedrock-session-token"
                type="password"
                value={form.sessionToken}
                onChange={(event) => updateField("sessionToken", event.target.value)}
                placeholder="For temporary credentials"
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="bedrock-region" className="text-sm font-medium">
                  Region
                </label>
                <input
                  id="bedrock-region"
                  value={form.region}
                  onChange={(event) => updateField("region", event.target.value)}
                  placeholder="us-east-1"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="bedrock-model" className="text-sm font-medium">
                  Model ID
                </label>
                <input
                  id="bedrock-model"
                  value={form.model}
                  onChange={(event) => updateField("model", event.target.value)}
                  placeholder={DEFAULT_BEDROCK_MODEL}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {testResult === "ok" ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                Credentials are valid and working
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
                  "Test credentials"
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
                  "Save credentials"
                )}
              </button>
              {hasCredentials ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={busy}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? "Removing…" : "Remove credentials"}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
