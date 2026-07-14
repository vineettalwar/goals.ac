"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  KeyRound,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StockProviderId } from "@workspace/stock-images";

type ProviderMeta = {
  id: StockProviderId;
  label: string;
  billing: "free" | "paid";
  searchImplemented: boolean;
  byokAllowed: boolean;
  docsUrl: string;
};

type ConfiguredCredential = {
  provider: string;
  apiKeyLastFour: string;
  billing: "free" | "paid";
  searchImplemented: boolean;
};

type StockCredentialsPayload = {
  platform?: { configured: boolean; unsplash: boolean; pexels: boolean };
  org?: ConfiguredCredential[];
  project?: ConfiguredCredential[];
  providers: ProviderMeta[];
};

interface Props {
  scope: "org" | "project";
  projectId?: string;
  canManage: boolean;
  /** When set, only show free (Unsplash/Pexels) or paid providers. Defaults to free-only. */
  billingFilter?: "paid" | "free" | "all";
  title?: string;
  description?: string;
}

export function StockByokPanel({
  scope,
  projectId,
  canManage,
  billingFilter = "free",
  title = "Stock photos (Unsplash / Pexels)",
  description = "Optional API keys for copyright-free stock search. Platform keys are used when unset.",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<StockCredentialsPayload | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderMeta | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; note?: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [removingProvider, setRemovingProvider] = useState<string | null>(null);

  const credentialsUrl =
    scope === "org"
      ? "/api/auth/stock-credentials"
      : `/api/website-projects/${projectId}/stock-credentials`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(credentialsUrl);
      if (!res.ok) return;
      setPayload(await res.json());
    } finally {
      setLoading(false);
    }
  }, [credentialsUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  const configured =
    scope === "org" ? (payload?.org ?? []) : (payload?.project ?? []);

  const configuredMap = new Map(configured.map((entry) => [entry.provider, entry]));

  const visibleProviders = (payload?.providers ?? []).filter((provider) => {
    if (billingFilter === "paid") return provider.billing === "paid";
    if (billingFilter === "free") return provider.billing === "free";
    return true;
  });

  function openDialog(provider: ProviderMeta) {
    setActiveProvider(provider);
    setApiKeyInput("");
    setTestResult(null);
    setDialogOpen(true);
  }

  async function testKey() {
    if (!activeProvider || !apiKeyInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/auth/stock-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: activeProvider.id, apiKey: apiKeyInput.trim() }),
    });
    setTestResult(await res.json());
    setTesting(false);
  }

  async function saveKey() {
    if (!activeProvider || !apiKeyInput.trim()) return;
    setSaving(true);
    const res = await fetch(credentialsUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: activeProvider.id, apiKey: apiKeyInput.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(err?.error ?? "Failed to save API key");
      return;
    }
    toast.success(`${activeProvider.label} API key saved`);
    setDialogOpen(false);
    await load();
  }

  async function removeKey(providerId: string) {
    setRemovingProvider(providerId);
    const res = await fetch(`${credentialsUrl}?provider=${encodeURIComponent(providerId)}`, {
      method: "DELETE",
    });
    setRemovingProvider(null);
    if (!res.ok) {
      toast.error("Failed to remove API key");
      return;
    }
    toast.success("API key removed");
    await load();
  }

  const defaultDescription =
    scope === "org"
      ? "Bring your own paid stock photo subscriptions. Keys are encrypted and shared across all projects in your organization. Unsplash and Pexels remain free via platform keys unless you add optional org overrides below."
      : "Optional project-level overrides for stock photo API keys. These take priority over organization and platform keys for this site.";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <ImageIcon className="h-4 w-4 text-sky-500" />
          {title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{description ?? defaultDescription}</p>
      </div>

      {payload?.platform && scope === "org" && (
        <div className="rounded-lg border border-border px-3 py-2.5 text-xs text-muted-foreground">
          Platform free stock:{" "}
          {payload.platform.configured
            ? [
                payload.platform.unsplash ? "Unsplash" : null,
                payload.platform.pexels ? "Pexels" : null,
              ]
                .filter(Boolean)
                .join(" + ") || "configured"
            : "not configured"}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading credentials…</p>
      ) : (
        <div className="space-y-2">
          {visibleProviders.map((provider) => {
            const existing = configuredMap.get(provider.id);
            return (
              <div
                key={provider.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{provider.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {provider.billing === "paid" ? "Paid · BYOK" : "Free · optional override"}
                    {provider.searchImplemented ? " · search enabled" : " · not available"}
                  </p>
                  {existing ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                      Connected · key ending ••••{existing.apiKeyLastFour}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    API docs <ExternalLink className="h-3 w-3" />
                  </a>
                  {canManage ? (
                    existing ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(provider)}
                        >
                          Replace
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={removingProvider === provider.id}
                          onClick={() => removeKey(provider.id)}
                        >
                          {removingProvider === provider.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => openDialog(provider)}>
                        <KeyRound className="h-3.5 w-3.5" /> Add key
                      </Button>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!canManage && scope === "org" && (
        <p className="text-xs text-muted-foreground">Only site admins can manage organization stock API keys.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeProvider?.label} API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="stock-api-key">API key</Label>
              <Input
                id="stock-api-key"
                type="password"
                autoComplete="off"
                placeholder={`${activeProvider?.label ?? "Stock"} API key`}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>
            {testResult ? (
              testResult.ok ? (
                <div className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{testResult.note ?? "Connection successful"}</span>
                </div>
              ) : (
                <p className="text-xs text-destructive">{testResult.error ?? "Connection failed"}</p>
              )
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={testKey} disabled={testing || !apiKeyInput.trim()}>
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
            </Button>
            <Button type="button" onClick={saveKey} disabled={saving || !apiKeyInput.trim()}>
              {saving ? "Saving…" : "Save key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
