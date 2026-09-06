"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, KeyRound, CheckCircle2, Loader2 } from "lucide-react";
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
import { SEMRUSH_DATABASES as SEMRUSH_DATABASE_CODES } from "@workspace/keyword-research-provider";
import {
  contentLanguageLabel,
  semrushDatabaseForLanguage,
  semrushDatabaseLabel,
} from "@workspace/content-engine/support/content/content-language";

const SEMRUSH_DATABASES = SEMRUSH_DATABASE_CODES.map((value) => ({
  value,
  label: semrushDatabaseLabel(value).replace(/ \([a-z]+\)$/i, ""),
}));

interface SemrushSectionProps {
  canManage: boolean;
  initialHasCredentials?: boolean;
  initialApiKeyLastFour?: string | null;
  initialDatabase?: string;
  activeProject?: { primaryLanguage?: string | null } | null;
}

export function SettingsAiSemrushSection({
  canManage,
  initialHasCredentials = false,
  initialApiKeyLastFour = null,
  initialDatabase = "us",
  activeProject,
}: SemrushSectionProps) {
  const [hasCredentials, setHasCredentials] = useState(initialHasCredentials);
  const [apiKeyLastFour, setApiKeyLastFour] = useState<string | null>(initialApiKeyLastFour);
  const [database, setDatabase] = useState(initialDatabase);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [formDatabase, setFormDatabase] = useState("us");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const suggestedDatabase = semrushDatabaseForLanguage(activeProject?.primaryLanguage ?? undefined);
  const showDatabaseHint =
    Boolean(suggestedDatabase) &&
    suggestedDatabase !== formDatabase &&
    Boolean(activeProject?.primaryLanguage) &&
    activeProject?.primaryLanguage !== "en";

  function openDialog() {
    setApiKeyInput("");
    const suggested = semrushDatabaseForLanguage(activeProject?.primaryLanguage ?? undefined);
    setFormDatabase(suggested ?? (database || "us"));
    setTestResult(null);
    setDialogOpen(true);
  }

  async function testCredentials() {
    if (!apiKeyInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/auth/semrush-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKeyInput.trim(), database: formDatabase }),
    });
    setTestResult(await res.json());
    setTesting(false);
  }

  async function saveCredentials() {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    const res = await fetch("/api/auth/semrush-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKeyInput.trim(), database: formDatabase }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save Semrush credentials");
      return;
    }
    const data = await res.json();
    setHasCredentials(true);
    setApiKeyLastFour(data.apiKeyLastFour ?? apiKeyInput.slice(-4));
    setDatabase(data.database ?? formDatabase);
    setDialogOpen(false);
    toast.success("Semrush API key saved");
  }

  async function removeCredentials() {
    setDeleting(true);
    const res = await fetch("/api/auth/semrush-credentials", { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error("Failed to remove Semrush credentials"); return; }
    setHasCredentials(false);
    setApiKeyLastFour(null);
    toast.success("Semrush credentials removed");
  }

  return (
    <>
      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-orange-500" />
          Semrush (BYOK)
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect your Semrush API key to pull keyword gaps, search volume, and difficulty into content suggestions.
          {!canManage && " Only site admins can manage Semrush credentials."}
        </p>
        {hasCredentials ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Organization Semrush API key connected</p>
                <p className="text-xs text-muted-foreground">
                  Key ending in ••••{apiKeyLastFour ?? "••••"}
                  {database ? ` · database: ${semrushDatabaseLabel(database)}` : ""}
                </p>
              </div>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openDialog}>Replace key</Button>
                <Button variant="outline" size="sm" onClick={removeCredentials} disabled={deleting}>
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                </Button>
              </div>
            )}
          </div>
        ) : canManage ? (
          <Button variant="outline" size="sm" onClick={openDialog}>
            <KeyRound className="mr-2 h-3.5 w-3.5" />Add Semrush API key
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No organization Semrush credentials configured.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Semrush API key</DialogTitle>
            <DialogDescription>
              Your key is encrypted and stored securely. Used for keyword gap analysis and metrics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="semrush-api-key">API key</Label>
              <Input
                id="semrush-api-key"
                type="password"
                placeholder="Semrush API key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="semrush-database">Regional database</Label>
              <Select value={formDatabase} onValueChange={setFormDatabase}>
                <SelectTrigger id="semrush-database">
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {SEMRUSH_DATABASES.map((db) => (
                    <SelectItem key={db.value} value={db.value}>
                      {db.label} ({db.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showDatabaseHint && suggestedDatabase && (
                <p className="text-xs text-muted-foreground">
                  Suggested for your active project&apos;s language (
                  {contentLanguageLabel(activeProject?.primaryLanguage ?? undefined)}):{" "}
                  {semrushDatabaseLabel(suggestedDatabase)}
                </p>
              )}
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {testResult.ok ? <CheckIcon className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testResult.ok ? "API key is valid" : testResult.error ?? "Key test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={testCredentials}
                disabled={testing || !apiKeyInput.trim()}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test key"}
              </Button>
              <Button onClick={saveCredentials} disabled={saving || !apiKeyInput.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
