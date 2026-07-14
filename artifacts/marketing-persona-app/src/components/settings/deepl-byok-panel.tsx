"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeeplCredentialsPayload = {
  configured: boolean;
  apiKeyLastFour?: string | null;
  resolvedSource?: "project" | "org" | null;
  org?: {
    configured: boolean;
    apiKeyLastFour?: string | null;
  };
  project?: {
    configured: boolean;
    apiKeyLastFour?: string | null;
  };
  deeplRefinementEnabled?: boolean;
  deeplGlossaryId?: string;
  docsUrl?: string;
};

interface Props {
  scope: "org" | "project";
  projectId?: string;
  canManage: boolean;
  title?: string;
  description?: string;
}

export function DeeplByokPanel({
  scope,
  projectId,
  canManage,
  title = "DeepL translation (BYOK)",
  description = "Optional DeepL API key to refine non-English drafts after humanization. Organization keys apply to all projects unless overridden.",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<DeeplCredentialsPayload | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; note?: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [refinementEnabled, setRefinementEnabled] = useState(true);
  const [glossaryId, setGlossaryId] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const credentialsUrl =
    scope === "org"
      ? "/api/auth/deepl-credentials"
      : `/api/website-projects/${projectId}/deepl-credentials`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(credentialsUrl);
      if (!res.ok) return;
      const data = (await res.json()) as DeeplCredentialsPayload;
      setPayload(data);
      if (scope === "project") {
        setRefinementEnabled(data.deeplRefinementEnabled !== false);
        setGlossaryId(data.deeplGlossaryId ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [credentialsUrl, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const configured =
    scope === "org"
      ? Boolean(payload?.configured)
      : Boolean(payload?.configured);
  const keyLastFour =
    scope === "org"
      ? payload?.apiKeyLastFour
      : payload?.project?.configured
        ? payload.project.apiKeyLastFour
        : payload?.org?.apiKeyLastFour;

  function openDialog() {
    setApiKeyInput("");
    setTestResult(null);
    setDialogOpen(true);
  }

  async function testKey() {
    if (!apiKeyInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/auth/deepl-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setTesting(false);
    setTestResult(data);
  }

  async function saveKey() {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    const res = await fetch(credentialsUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to save DeepL key");
      return;
    }
    toast.success("DeepL API key saved");
    setDialogOpen(false);
    void load();
  }

  async function removeKey() {
    setRemoving(true);
    const res = await fetch(credentialsUrl, { method: "DELETE" });
    setRemoving(false);
    if (!res.ok) {
      toast.error("Failed to remove DeepL key");
      return;
    }
    toast.success("DeepL API key removed");
    void load();
  }

  async function saveProjectSettings() {
    if (scope !== "project") return;
    setSavingSettings(true);
    const res = await fetch(credentialsUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deeplRefinementEnabled: refinementEnabled,
        deeplGlossaryId: glossaryId.trim() || null,
      }),
    });
    setSavingSettings(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to save DeepL settings");
      return;
    }
    toast.success("DeepL settings saved");
    void load();
  }

  const resolvedLabel =
    scope === "project"
      ? payload?.resolvedSource === "project"
        ? "using project key"
        : payload?.resolvedSource === "org"
          ? "using organization key"
          : "not configured — AI-only"
      : configured
        ? "organization key configured"
        : "not configured";

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading DeepL settings...
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-sky-500" />
          {title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {scope === "project" && (
          <p className="text-xs text-muted-foreground mt-1">DeepL: {resolvedLabel}</p>
        )}
      </div>

      {configured ? (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {scope === "org" ? "Organization DeepL key connected" : "DeepL key available for this project"}
            </p>
            <p className="text-xs text-muted-foreground">Key ending in ••••{keyLastFour ?? "••••"}</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openDialog}>
                Replace
              </Button>
              {(scope === "org" || payload?.project?.configured) && (
                <Button variant="outline" size="sm" onClick={removeKey} disabled={removing}>
                  {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : canManage ? (
        <Button variant="outline" size="sm" onClick={openDialog}>
          <KeyRound className="mr-2 h-3.5 w-3.5" />
          Add DeepL API key
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">No DeepL credentials configured.</p>
      )}

      {scope === "project" && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="deepl-refinement-enabled">Refine non-English drafts with DeepL</Label>
              <p className="text-xs text-muted-foreground">
                AI drafts in English, then DeepL localizes after humanization when project language is not English.
              </p>
            </div>
            <Switch
              id="deepl-refinement-enabled"
              checked={refinementEnabled}
              onCheckedChange={setRefinementEnabled}
              disabled={!canManage}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deepl-glossary-id">DeepL glossary ID (optional)</Label>
            <Input
              id="deepl-glossary-id"
              value={glossaryId}
              onChange={(e) => setGlossaryId(e.target.value)}
              placeholder="glossary_xxxxxxxx"
              disabled={!canManage}
            />
          </div>
          {canManage && (
            <Button variant="outline" size="sm" onClick={saveProjectSettings} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save DeepL settings"}
            </Button>
          )}
        </div>
      )}

      {payload?.docsUrl && (
        <a
          href={payload.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          DeepL API docs
          <ExternalLink className="h-3 w-3" />
        </a>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{scope === "org" ? "Organization DeepL API key" : "Project DeepL API key"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="deepl-api-key">API key</Label>
              <Input
                id="deepl-api-key"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="DeepL Pro API key"
                autoComplete="off"
              />
            </div>
            {testResult && (
              <p
                className={`text-sm ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}
              >
                {testResult.ok ? testResult.note ?? "Connection successful" : testResult.error}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={testKey} disabled={testing || !apiKeyInput.trim()}>
              {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
            </Button>
            <Button onClick={saveKey} disabled={saving || !apiKeyInput.trim()}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
