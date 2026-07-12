"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Cpu,
  Shield,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const profileSchema = z.object({ name: z.string().min(1) });
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "At least 8 characters"),
});

interface UsageSummary {
  plan: "starter" | "growth" | "scale";
  articlesThisMonth: number;
  quota: number | null;
  quotaRemaining: number | null;
  usesByok: boolean;
  byokSpendThisMonthUsd: number;
}

interface AiProviderStatus {
  activeProvider: string;
  gemini: { configured: boolean; source: string | null };
  bedrock: { configured: boolean; region: string | null; model: string | null };
  ollama: { configured: boolean; baseUrl: string; model: string; reachable: boolean };
}

const PLAN_LABELS: Record<UsageSummary["plan"], string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

export function SettingsClient() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState("profile");
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [geminiLastFour, setGeminiLastFour] = useState<string | null>(null);
  const [hasGoogleId, setHasGoogleId] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(null);
  const [geminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingKey, setDeletingKey] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    values: { name: session?.user.name ?? "" },
  });
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/usage").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/api-key").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ai-providers/status").then((r) => (r.ok ? r.json() : null)),
    ]).then(([usageData, meData, keyData, aiData]) => {
      if (usageData?.usage) setUsage(usageData.usage);
      if (meData) {
        setHasGoogleId(meData.hasGoogleId ?? false);
        setHasPassword(meData.hasPassword ?? false);
        if (meData.hasGeminiKey) setHasGeminiKey(true);
      }
      if (keyData?.hasKey) {
        setHasGeminiKey(true);
        setGeminiLastFour(keyData.lastFour ?? null);
      }
      if (aiData) setAiStatus(aiData);
      setUsageLoading(false);
    });
  }, []);

  async function saveProfile(data: { name: string }) {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name }),
    });
    if (!res.ok) { toast.error("Failed to save"); return; }
    await update({ name: data.name });
    toast.success("Profile updated");
  }

  async function changePassword(data: { currentPassword: string; newPassword: string }) {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to change password");
      return;
    }
    passwordForm.reset();
    toast.success("Password updated");
  }

  async function testGeminiKey() {
    if (!geminiKeyInput.trim()) return;
    setGeminiTesting(true);
    setGeminiTestResult(null);
    const res = await fetch("/api/auth/api-key/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: geminiKeyInput }),
    });
    setGeminiTestResult(await res.json());
    setGeminiTesting(false);
  }

  async function saveGeminiKey() {
    if (!geminiKeyInput.trim()) return;
    setGeminiSaving(true);
    const res = await fetch("/api/auth/api-key", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: geminiKeyInput }),
    });
    setGeminiSaving(false);
    if (!res.ok) { toast.error("Failed to save key"); return; }
    const data = await res.json();
    setHasGeminiKey(true);
    setGeminiLastFour(data.lastFour ?? geminiKeyInput.slice(-4));
    setGeminiDialogOpen(false);
    setGeminiKeyInput("");
    toast.success("Gemini API key saved");
  }

  async function removeGeminiKey() {
    setDeletingKey(true);
    const res = await fetch("/api/auth/api-key", { method: "DELETE" });
    setDeletingKey(false);
    if (!res.ok) { toast.error("Failed to remove key"); return; }
    setHasGeminiKey(false);
    setGeminiLastFour(null);
    toast.success("API key removed");
  }

  async function deleteAccount() {
    if (!confirm("Delete your account and all projects? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch("/api/auth/me/delete", { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error("Failed to delete account"); return; }
    window.location.href = "/login";
  }

  const isGoogleOnly = hasGoogleId && !hasPassword;
  const activeProvider = aiStatus?.activeProvider ?? "gemini";

  return (
    <div className="px-8 py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your profile, AI providers, and account.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="profile"><User className="w-4 h-4 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="ai">
            <Cpu className="w-4 h-4 mr-1.5" />AI Providers
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{activeProvider}</span>
          </TabsTrigger>
          {!isGoogleOnly && (
            <TabsTrigger value="security"><Shield className="w-4 h-4 mr-1.5" />Security</TabsTrigger>
          )}
          <TabsTrigger value="account"><AlertTriangle className="w-4 h-4 mr-1.5" />Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold">Profile</h2>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{session?.user.email}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" {...profileForm.register("name")} />
            </div>
            <Button onClick={profileForm.handleSubmit(saveProfile)}>Save changes</Button>
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold">Usage this month</h2>
            {usageLoading && <p className="text-sm text-muted-foreground">Loading usage…</p>}
            {usage && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Articles</p>
                  <p className="text-2xl font-bold">{usage.articlesThisMonth}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Plan</p>
                  <p className="text-2xl font-bold">{PLAN_LABELS[usage.plan]}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <Cpu className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">
                Active provider: <span className="capitalize text-primary">{activeProvider}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure via the <code className="px-1 py-0.5 rounded bg-muted text-xs">AI_PROVIDER</code> env var.
              </p>
            </div>
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold">Google Gemini (BYOK)</h2>
            <p className="text-sm text-muted-foreground">
              Bring your own API key to route AI generation through your Gemini account.
            </p>
            {hasGeminiKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Gemini API key connected</p>
                    <p className="text-xs text-muted-foreground">Ending in ••••{geminiLastFour ?? "••••"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiDialogOpen(true); }}>
                    Replace key
                  </Button>
                  <Button variant="outline" size="sm" onClick={removeGeminiKey} disabled={deletingKey}>
                    {deletingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiDialogOpen(true); }}>
                <KeyRound className="mr-2 h-3.5 w-3.5" />Add Gemini API key
              </Button>
            )}
          </div>

          {aiStatus && (
            <div className="paper-card p-6 space-y-3 text-sm">
              <h2 className="font-semibold">Provider status</h2>
              <div className="flex justify-between">
                <span>Gemini (platform)</span>
                <span className={aiStatus.gemini.configured ? "text-emerald-600" : "text-muted-foreground"}>
                  {aiStatus.gemini.configured ? `Configured (${aiStatus.gemini.source})` : "Not configured"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>AWS Bedrock</span>
                <span className={aiStatus.bedrock.configured ? "text-emerald-600" : "text-muted-foreground"}>
                  {aiStatus.bedrock.configured ? "Configured" : "Not configured"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ollama ({aiStatus.ollama.baseUrl})</span>
                <span className={aiStatus.ollama.reachable ? "text-emerald-600" : "text-muted-foreground"}>
                  {aiStatus.ollama.reachable ? "Reachable" : "Unreachable"}
                </span>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="security">
          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold">Change password</h2>
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" type="password" {...passwordForm.register("currentPassword")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
            </div>
            <Button variant="outline" onClick={passwordForm.handleSubmit(changePassword)}>Change password</Button>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline block">Forgot password?</Link>
          </div>
        </TabsContent>

        <TabsContent value="account">
          <div className="paper-card p-6 space-y-4 border-destructive/30">
            <h2 className="font-semibold text-destructive">Danger zone</h2>
            <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
            <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={geminiDialogOpen} onOpenChange={setGeminiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gemini API key</DialogTitle>
            <DialogDescription>Your key is encrypted and stored securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="AIza..."
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
            />
            {geminiTestResult && (
              <div className={`flex items-center gap-2 text-sm ${geminiTestResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {geminiTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {geminiTestResult.ok ? "Key is valid" : geminiTestResult.error ?? "Key test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={testGeminiKey} disabled={geminiTesting || !geminiKeyInput}>
                {geminiTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test key"}
              </Button>
              <Button onClick={saveGeminiKey} disabled={geminiSaving || !geminiKeyInput}>
                {geminiSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
