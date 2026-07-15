import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, ImageIcon, KeyRound, Loader2, Trash2, X } from "lucide-react";
import type { SettingsStockProviderMeta, SettingsStockCredential } from "./types";

export function SettingsStockByokPanel({
  platform,
  orgCredentials,
  providers,
  canManage,
  onSave,
  onDelete,
  onTest,
  savingProvider = null,
  removingProvider = null,
}: {
  platform?: { configured: boolean; unsplash: boolean; pexels: boolean };
  orgCredentials: SettingsStockCredential[];
  providers: SettingsStockProviderMeta[];
  canManage: boolean;
  onSave: (input: { provider: string; apiKey: string }) => Promise<void>;
  onDelete: (provider: string) => Promise<void>;
  onTest: (input: {
    provider: string;
    apiKey: string;
  }) => Promise<{ ok: boolean; error?: string; note?: string }>;
  savingProvider?: string | null;
  removingProvider?: string | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<SettingsStockProviderMeta | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; note?: string } | null>(
    null,
  );

  const configuredMap = new Map(orgCredentials.map((entry) => [entry.provider, entry]));
  const visibleProviders = providers.filter((provider) => provider.billing === "free");

  useEffect(() => {
    if (!dialogOpen) {
      setApiKeyInput("");
      setTestResult(null);
    }
  }, [dialogOpen]);

  function openDialog(provider: SettingsStockProviderMeta) {
    setActiveProvider(provider);
    setApiKeyInput("");
    setTestResult(null);
    setDialogOpen(true);
  }

  async function handleTest() {
    if (!activeProvider || !apiKeyInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest({
        provider: activeProvider.id,
        apiKey: apiKeyInput.trim(),
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        ok: false,
        error: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!activeProvider || !apiKeyInput.trim()) return;
    await onSave({ provider: activeProvider.id, apiKey: apiKeyInput.trim() });
    setDialogOpen(false);
  }

  return (
    <div className="space-y-4">
      {platform ? (
        <div className="rounded-lg border border-border px-3 py-2.5 text-xs text-muted-foreground">
          Platform free stock:{" "}
          {platform.configured
            ? [platform.unsplash ? "Unsplash" : null, platform.pexels ? "Pexels" : null]
                .filter(Boolean)
                .join(" + ") || "configured"
            : "not configured"}
        </div>
      ) : null}

      <div className="space-y-2">
        {visibleProviders.map((provider) => {
          const existing = configuredMap.get(provider.id);
          return (
            <div
              key={provider.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{provider.label}</p>
                <p className="text-xs text-muted-foreground">
                  {provider.billing === "paid" ? "Paid · BYOK" : "Free · optional override"}
                  {provider.searchImplemented ? " · search enabled" : " · not available"}
                </p>
                {existing ? (
                  <p className="mt-1 text-xs text-emerald-700">
                    Connected · key ending ••••{existing.apiKeyLastFour}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  API docs <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
                {canManage ? (
                  existing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openDialog(provider)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(provider.id)}
                        disabled={removingProvider === provider.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                        aria-label={`Remove ${provider.label} key`}
                      >
                        {removingProvider === provider.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openDialog(provider)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
                    >
                      <KeyRound className="h-3.5 w-3.5" aria-hidden />
                      Add key
                    </button>
                  )
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {!canManage ? (
        <p className="text-xs text-muted-foreground">
          Only organization owners and site admins can manage organization stock API keys.
        </p>
      ) : null}

      {dialogOpen && activeProvider ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => setDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-key-dialog-title"
            className="paper-card relative z-10 w-full max-w-md p-6 shadow-lg"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="stock-key-dialog-title" className="flex items-center gap-2 text-lg font-semibold">
                <ImageIcon className="h-4 w-4 text-primary" aria-hidden />
                {activeProvider.label} API key
              </h2>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close dialog"
                onClick={() => setDialogOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="stock-api-key" className="text-sm font-medium">
                  API key
                </label>
                <input
                  id="stock-api-key"
                  type="password"
                  value={apiKeyInput}
                  onChange={(event) => {
                    setApiKeyInput(event.target.value);
                    setTestResult(null);
                  }}
                  placeholder={`${activeProvider.label} API key`}
                  autoComplete="off"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {testResult ? (
                testResult.ok ? (
                  <div className="flex items-start gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{testResult.note ?? "Connection successful"}</span>
                  </div>
                ) : (
                  <p className="text-sm text-red-700">{testResult.error ?? "Connection failed"}</p>
                )
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleTest()}
                  disabled={testing || !apiKeyInput.trim()}
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
                  disabled={savingProvider === activeProvider.id || !apiKeyInput.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {savingProvider === activeProvider.id ? "Saving…" : "Save key"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
