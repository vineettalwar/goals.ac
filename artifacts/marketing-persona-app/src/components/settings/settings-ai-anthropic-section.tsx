"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 as CheckIcon, XCircle } from "lucide-react";
import type { AiProviderStatus } from "@/components/settings/settings-types";

interface AnthropicSectionProps {
  canManage: boolean;
  initialHasKey?: boolean;
  initialLastFour?: string | null;
  onAiStatusChange?: (status: AiProviderStatus) => void;
}

export function SettingsAiAnthropicSection({
  canManage,
  initialHasKey = false,
  initialLastFour = null,
  onAiStatusChange,
}: AnthropicSectionProps) {
  const [hasKey, setHasKey] = useState(initialHasKey);
  const [lastFour, setLastFour] = useState<string | null>(initialLastFour);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openDialog() {
    setKeyInput("");
    setTestResult(null);
    setDialogOpen(true);
  }

  async function refreshStatus() {
    const res = await fetch("/api/ai-providers/status");
    if (res.ok && onAiStatusChange) onAiStatusChange(await res.json());
  }

  async function testKey() {
    if (!keyInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/auth/anthropic-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyInput }),
    });
    setTestResult(await res.json());
    setTesting(false);
  }

  async function saveKey() {
    if (!keyInput.trim()) return;
    setSaving(true);
    const res = await fetch("/api/auth/anthropic-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyInput }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to save key"); return; }
    const data = await res.json();
    setHasKey(true);
    setLastFour(data.lastFour ?? keyInput.slice(-4));
    setDialogOpen(false);
    setKeyInput("");
    toast.success("Anthropic API key saved");
    await refreshStatus();
  }

  async function removeKey() {
    setDeleting(true);
    const res = await fetch("/api/auth/anthropic-credentials", { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error("Failed to remove key"); return; }
    setHasKey(false);
    setLastFour(null);
    toast.success("Anthropic API key removed");
    await refreshStatus();
  }

  return (
    <>
      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold">Anthropic (Claude) BYOK</h2>
        <p className="text-sm text-muted-foreground">
          Bring your own Anthropic API key to route AI generation through Claude directly (not via AWS Bedrock).
          {!canManage && " Only site admins can manage the API key."}
        </p>
        {hasKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Organization Anthropic API key connected</p>
                <p className="text-xs text-muted-foreground">Ending in ••••{lastFour ?? "••••"}</p>
              </div>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openDialog}>Replace key</Button>
                <Button variant="outline" size="sm" onClick={removeKey} disabled={deleting}>
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                </Button>
              </div>
            )}
          </div>
        ) : canManage ? (
          <Button variant="outline" size="sm" onClick={openDialog}>
            <KeyRound className="mr-2 h-3.5 w-3.5" />Add Anthropic API key
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No organization Anthropic API key configured.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anthropic API key</DialogTitle>
            <DialogDescription>Your key is encrypted and stored securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            {testResult && (
              <div className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {testResult.ok ? <CheckIcon className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testResult.ok ? "Key is valid" : testResult.error ?? "Key test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={testKey} disabled={testing || !keyInput}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test key"}
              </Button>
              <Button onClick={saveKey} disabled={saving || !keyInput}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
