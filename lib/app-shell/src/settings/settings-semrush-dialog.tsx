import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, X, XCircle } from "lucide-react";

const SEMRUSH_DATABASES = [
  "us",
  "uk",
  "ca",
  "au",
  "de",
  "fr",
  "es",
  "it",
  "br",
  "in",
  "nl",
  "pl",
  "jp",
  "kr",
  "cn",
  "tw",
  "tr",
  "ae",
  "se",
  "dk",
  "fi",
  "no",
  "cz",
  "ro",
  "hu",
  "gr",
  "id",
  "vn",
  "th",
  "sk",
  "bg",
  "il",
] as const;

const DATABASE_LABELS: Record<string, string> = {
  us: "United States",
  uk: "United Kingdom",
  ca: "Canada",
  au: "Australia",
  de: "Germany",
  fr: "France",
  es: "Spain",
  it: "Italy",
  br: "Brazil",
  in: "India",
  nl: "Netherlands",
  pl: "Poland",
  jp: "Japan",
  kr: "South Korea",
  cn: "China",
  tw: "Taiwan",
  tr: "Turkey",
  ae: "United Arab Emirates",
  se: "Sweden",
  dk: "Denmark",
  fi: "Finland",
  no: "Norway",
  cz: "Czech Republic",
  ro: "Romania",
  hu: "Hungary",
  gr: "Greece",
  id: "Indonesia",
  vn: "Vietnam",
  th: "Thailand",
  sk: "Slovakia",
  bg: "Bulgaria",
  il: "Israel",
};

function semrushDatabaseLabel(database: string): string {
  const label = DATABASE_LABELS[database] ?? database.toUpperCase();
  return `${label} (${database})`;
}

export function SettingsSemrushDialog({
  open,
  onOpenChange,
  hasCredentials,
  apiKeyLastFour,
  database,
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
  apiKeyLastFour: string | null;
  database: string;
  onSave: (input: { apiKey: string; database: string }) => Promise<void>;
  onDelete: () => Promise<void>;
  onTest: (input: { apiKey: string; database: string }) => Promise<{ ok: boolean; error?: string }>;
  canManage: boolean;
  saving?: boolean;
  deleting?: boolean;
}) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [formDatabase, setFormDatabase] = useState(database || "us");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setApiKeyInput("");
      setFormDatabase(database || "us");
      setTestResult(null);
      setTestError(null);
    }
  }, [open, database]);

  if (!open) return null;

  const busy = saving || deleting || testing;

  function close() {
    if (busy) return;
    onOpenChange(false);
  }

  async function handleTest() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const result = await onTest({ apiKey: trimmed, database: formDatabase });
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
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    await onSave({ apiKey: trimmed, database: formDatabase });
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!window.confirm("Remove the organization Semrush API key?")) return;
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
        aria-labelledby="semrush-key-dialog-title"
        className="paper-card relative z-10 w-full max-w-md p-6 shadow-lg"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="semrush-key-dialog-title" className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden />
            {hasCredentials ? "Replace Semrush API key" : "Add Semrush API key"}
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
            Only organization owners and site admins can manage Semrush credentials.
          </p>
        ) : (
          <div className="space-y-4">
            {hasCredentials ? (
              <p className="text-sm text-muted-foreground">
                Current key ending in ••••{apiKeyLastFour ?? "••••"} will be replaced.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="semrush-api-key" className="text-sm font-medium">
                API key
              </label>
              <input
                id="semrush-api-key"
                type="password"
                value={apiKeyInput}
                onChange={(event) => {
                  setApiKeyInput(event.target.value);
                  setTestResult(null);
                  setTestError(null);
                }}
                placeholder="Semrush API key"
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="semrush-database" className="text-sm font-medium">
                Regional database
              </label>
              <select
                id="semrush-database"
                value={formDatabase}
                onChange={(event) => setFormDatabase(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                {SEMRUSH_DATABASES.map((entry) => (
                  <option key={entry} value={entry}>
                    {semrushDatabaseLabel(entry)}
                  </option>
                ))}
              </select>
            </div>

            {testResult === "ok" ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                API key is valid
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
                disabled={!apiKeyInput.trim() || busy}
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
                disabled={!apiKeyInput.trim() || busy}
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

export { semrushDatabaseLabel };
