"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Cloud, KeyRound, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 as CheckIcon, XCircle } from "lucide-react";
import { useBedrockAccountModels } from "@/hooks/use-bedrock-account-models";
import { BEDROCK_MODEL_CUSTOM } from "@workspace/ai-providers/bedrock-models";
import type { AiProviderStatus } from "@/components/settings/settings-types";

interface BedrockSectionProps {
  canManage: boolean;
  initialHasCredentials?: boolean;
  initialAccessKeyLastFour?: string | null;
  initialModel?: string;
  onAiStatusChange?: (status: AiProviderStatus) => void;
}

export function SettingsAiBedrockSection({
  canManage,
  initialHasCredentials = false,
  initialAccessKeyLastFour = null,
  initialModel = "",
  onAiStatusChange,
}: BedrockSectionProps) {
  const [hasCredentials, setHasCredentials] = useState(initialHasCredentials);
  const [accessKeyLastFour, setAccessKeyLastFour] = useState<string | null>(initialAccessKeyLastFour);
  const [orgModel, setOrgModel] = useState(initialModel);
  const [modelDraft, setModelDraft] = useState(initialModel);
  const [modelSaving, setModelSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ apiKey: string; model: string }>({ apiKey: "", model: "" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    models: orgModels,
    loading: orgModelsLoading,
    error: orgModelsError,
  } = useBedrockAccountModels("", hasCredentials && canManage);
  const orgKnownIds = new Set(orgModels.map((m) => m.id));

  const {
    models: dialogModels,
    loading: dialogModelsLoading,
    error: dialogModelsError,
  } = useBedrockAccountModels(form.apiKey, dialogOpen);
  const dialogKnownIds = new Set(dialogModels.map((m) => m.id));

  async function refreshStatus() {
    const res = await fetch("/api/ai-providers/status");
    if (res.ok && onAiStatusChange) onAiStatusChange(await res.json());
  }

  function openDialog() {
    setForm({ apiKey: "", model: orgModel });
    setTestResult(null);
    setDialogOpen(true);
  }

  async function testCredentials() {
    const payload = { apiKey: form.apiKey.trim(), model: form.model.trim() };
    if (!payload.apiKey) return;
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/auth/bedrock-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setTestResult(await res.json());
    setTesting(false);
  }

  async function saveCredentials() {
    const payload = { apiKey: form.apiKey.trim(), model: form.model.trim() };
    if (!payload.apiKey) return;
    setSaving(true);
    const res = await fetch("/api/auth/bedrock-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save Bedrock API key");
      return;
    }
    const data = await res.json();
    setHasCredentials(true);
    setAccessKeyLastFour(data.accessKeyLastFour ?? payload.apiKey.slice(-4));
    if (payload.model) { setOrgModel(payload.model); setModelDraft(payload.model); }
    setDialogOpen(false);
    toast.success("Bedrock API key saved");
    await refreshStatus();
  }

  async function saveOrgModel() {
    const model = modelDraft.trim();
    if (!model) { toast.error("Choose a Bedrock model"); return; }
    setModelSaving(true);
    const res = await fetch("/api/auth/bedrock-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    setModelSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save Bedrock model");
      return;
    }
    setOrgModel(model);
    toast.success("Bedrock model updated");
    await refreshStatus();
  }

  async function removeCredentials() {
    setDeleting(true);
    const res = await fetch("/api/auth/bedrock-credentials", { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error("Failed to remove Bedrock credentials"); return; }
    setHasCredentials(false);
    setAccessKeyLastFour(null);
    setOrgModel("");
    setModelDraft("");
    toast.success("Bedrock credentials removed");
    await refreshStatus();
  }

  return (
    <>
      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Cloud className="w-4 h-4 text-amber-500" />
          AWS Bedrock (BYOK)
        </h2>
        <p className="text-sm text-muted-foreground">
          Bring your own Bedrock API key to run Claude and other Bedrock models through your AWS account.
          {!canManage && " Only site admins can manage Bedrock credentials."}
        </p>
        {hasCredentials ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Organization Bedrock API key connected</p>
                <p className="text-xs text-muted-foreground">
                  Key ending in ••••{accessKeyLastFour ?? "••••"}
                  {orgModel ? ` · model: ${orgModel}` : ""}
                </p>
              </div>
            </div>
            {canManage && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bedrock-org-model">Organization model</Label>
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 max-w-md flex-1 space-y-1.5">
                      <Select
                        value={
                          !modelDraft
                            ? undefined
                            : orgKnownIds.has(modelDraft)
                              ? modelDraft
                              : BEDROCK_MODEL_CUSTOM
                        }
                        onValueChange={(value) => {
                          if (value === BEDROCK_MODEL_CUSTOM) {
                            setModelDraft(orgKnownIds.has(modelDraft) ? "" : modelDraft);
                            return;
                          }
                          setModelDraft(value);
                        }}
                        disabled={orgModelsLoading || modelSaving}
                      >
                        <SelectTrigger id="bedrock-org-model">
                          <SelectValue
                            placeholder={orgModelsLoading ? "Loading models…" : "Choose a Bedrock model"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {orgModels.map((choice) => (
                            <SelectItem key={choice.id} value={choice.id}>{choice.label}</SelectItem>
                          ))}
                          <SelectItem value={BEDROCK_MODEL_CUSTOM}>Custom model id…</SelectItem>
                        </SelectContent>
                      </Select>
                      {!modelDraft || !orgKnownIds.has(modelDraft) ? (
                        <Input
                          id="bedrock-org-model-custom"
                          value={modelDraft}
                          onChange={(e) => setModelDraft(e.target.value)}
                          placeholder="e.g. amazon.nova-lite-v1:0"
                          className="font-mono text-sm"
                          autoComplete="off"
                        />
                      ) : null}
                      {orgModelsError ? <p className="text-xs text-muted-foreground">{orgModelsError}</p> : null}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void saveOrgModel()}
                      disabled={modelSaving || !modelDraft.trim() || modelDraft.trim() === orgModel}
                    >
                      {modelSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save model"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Models come from this AWS account. Change without re-entering the API key.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={openDialog}>Replace key</Button>
                  <Button variant="outline" size="sm" onClick={removeCredentials} disabled={deleting}>
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : canManage ? (
          <Button variant="outline" size="sm" onClick={openDialog}>
            <KeyRound className="mr-2 h-3.5 w-3.5" />Add Bedrock API key
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No organization Bedrock API key configured.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bedrock API key</DialogTitle>
            <DialogDescription>
              Paste a long-term Bedrock API key and choose the model to use for generation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bedrock-api-key">Bedrock API key</Label>
              <Input
                id="bedrock-api-key"
                type="password"
                placeholder="Paste Bedrock API key"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedrock-model">Model</Label>
              <Select
                value={
                  !form.model
                    ? undefined
                    : dialogKnownIds.has(form.model)
                      ? form.model
                      : BEDROCK_MODEL_CUSTOM
                }
                onValueChange={(value) => {
                  if (value === BEDROCK_MODEL_CUSTOM) {
                    setForm({ ...form, model: dialogKnownIds.has(form.model) ? "" : form.model });
                    return;
                  }
                  setForm({ ...form, model: value });
                }}
                disabled={dialogModelsLoading}
              >
                <SelectTrigger id="bedrock-model">
                  <SelectValue
                    placeholder={
                      dialogModelsLoading
                        ? "Loading models for this account…"
                        : dialogModels.length === 0
                          ? "Paste API key (or wait for account models)"
                          : "Choose a Bedrock model"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {dialogModels.map((choice) => (
                    <SelectItem key={choice.id} value={choice.id}>{choice.label}</SelectItem>
                  ))}
                  <SelectItem value={BEDROCK_MODEL_CUSTOM}>Custom model id…</SelectItem>
                </SelectContent>
              </Select>
              {dialogModelsError ? <p className="text-xs text-muted-foreground">{dialogModelsError}</p> : null}
              {!form.model || !dialogKnownIds.has(form.model) ? (
                <Input
                  id="bedrock-model-custom"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="e.g. amazon.nova-lite-v1:0"
                  className="font-mono text-sm"
                  autoComplete="off"
                />
              ) : null}
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {testResult.ok ? <CheckIcon className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testResult.ok ? "API key is valid" : testResult.error ?? "Credential test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={testCredentials}
                disabled={testing || !form.apiKey.trim() || !form.model.trim()}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test key"}
              </Button>
              <Button
                onClick={saveCredentials}
                disabled={saving || !form.apiKey.trim() || !form.model.trim()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
