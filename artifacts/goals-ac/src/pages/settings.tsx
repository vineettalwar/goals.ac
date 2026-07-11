import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, User, Lock, Trash2, AlertTriangle, KeyRound, CheckCircle2, XCircle,
  Cpu, Cloud, Globe, Shield, Server,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MeResponse {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  hasGoogleId: boolean;
  hasGeminiKey: boolean;
}

interface AiProviderStatus {
  activeProvider: string;
  gemini: { configured: boolean; source: string | null };
  bedrock: { configured: boolean; region: string | null; model: string | null };
  ollama: { configured: boolean; baseUrl: string | null; model: string | null; reachable: boolean };
}

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  avatarUrl: z.union([z.string().url("Must be a valid URL"), z.literal("")]).optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function Settings() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [isLoadingMe, setIsLoadingMe] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Gemini key state
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [geminiKeyLastFour, setGeminiKeyLastFour] = useState<string | null>(null);
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [isTestingGeminiKey, setIsTestingGeminiKey] = useState(false);
  const [isDeletingGeminiKey, setIsDeletingGeminiKey] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<"ok" | "error" | null>(null);
  const [geminiTestError, setGeminiTestError] = useState<string | null>(null);
  const [geminiKeyDialogOpen, setGeminiKeyDialogOpen] = useState(false);

  // AI provider status
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(null);
  const [isLoadingAiStatus, setIsLoadingAiStatus] = useState(true);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", avatarUrl: "" },
  });

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setMeData(data);
        profileForm.reset({ name: data.name, avatarUrl: data.avatarUrl ?? "" });
        if (data.hasGeminiKey) {
          fetch(`${API_BASE}/api/auth/api-key`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((kd: { hasKey: boolean; lastFour?: string }) => {
              if (kd.hasKey && kd.lastFour) setGeminiKeyLastFour(kd.lastFour);
            })
            .catch(() => null);
        }
      })
      .catch(() => {
        toast({ title: "Failed to load profile", variant: "destructive" });
      })
      .finally(() => setIsLoadingMe(false));

    // Fetch AI provider status
    fetch(`${API_BASE}/api/ai-providers/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data: AiProviderStatus | null) => {
        if (data) setAiStatus(data);
      })
      .catch(() => null)
      .finally(() => setIsLoadingAiStatus(false));
  }, [token]);

  const onSaveProfile = async (data: ProfileForm) => {
    if (!token) return;
    setIsSavingProfile(true);
    try {
      const body: Record<string, unknown> = { name: data.name };
      if (data.avatarUrl !== undefined) {
        body.avatarUrl = data.avatarUrl === "" ? null : data.avatarUrl;
      }
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to save profile", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      updateUser({ name: updated.name, avatarUrl: updated.avatarUrl ?? null });
      setMeData((prev) => prev ? { ...prev, name: updated.name, avatarUrl: updated.avatarUrl ?? null } : prev);
      toast({ title: "Profile saved" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onChangePassword = async (data: ChangePasswordForm) => {
    if (!token) return;
    setIsSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        passwordForm.setError("currentPassword", { message: err.error ?? "Failed to change password" });
        return;
      }
      passwordForm.reset();
      toast({ title: "Password changed successfully" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const onDeleteAccount = async () => {
    if (!token || !user) return;
    if (deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to delete account", variant: "destructive" });
        return;
      }
      logout();
      navigate("/", { replace: true });
    } finally {
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  const onTestGeminiKey = async () => {
    if (!token || !geminiKeyInput.trim()) return;
    setIsTestingGeminiKey(true);
    setGeminiTestResult(null);
    setGeminiTestError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/api-key/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: geminiKeyInput.trim() }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setGeminiTestResult("ok");
      } else {
        setGeminiTestResult("error");
        setGeminiTestError(data.error ?? "Key validation failed");
      }
    } catch {
      setGeminiTestResult("error");
      setGeminiTestError("Network error — please try again");
    } finally {
      setIsTestingGeminiKey(false);
    }
  };

  const onSaveGeminiKey = async () => {
    if (!token || !geminiKeyInput.trim()) return;
    setIsSavingGeminiKey(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/api-key`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: geminiKeyInput.trim() }),
      });
      const data = await res.json() as { ok: boolean; lastFour?: string; error?: string };
      if (!res.ok || !data.ok) {
        toast({ title: data.error ?? "Failed to save key", variant: "destructive" });
        return;
      }
      setGeminiKeyLastFour(data.lastFour ?? null);
      setMeData((prev) => prev ? { ...prev, hasGeminiKey: true } : prev);
      updateUser({ hasGeminiKey: true });
      setGeminiKeyInput("");
      setGeminiTestResult(null);
      setGeminiKeyDialogOpen(false);
      toast({ title: "Gemini API key saved" });
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  const onRemoveGeminiKey = async () => {
    if (!token) return;
    setIsDeletingGeminiKey(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/api-key`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to remove key", variant: "destructive" });
        return;
      }
      setGeminiKeyLastFour(null);
      setMeData((prev) => prev ? { ...prev, hasGeminiKey: false } : prev);
      updateUser({ hasGeminiKey: false });
      toast({ title: "Gemini API key removed" });
    } finally {
      setIsDeletingGeminiKey(false);
    }
  };

  if (isLoadingMe) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const isGoogleOnly = meData ? (meData.hasGoogleId && !meData.hasPassword) : false;
  const hasGeminiKey = meData?.hasGeminiKey ?? false;
  const activeProvider = aiStatus?.activeProvider ?? "gemini";

  return (
    <AppLayout>
      <SEO title="Settings — goals.ac" description="Manage your profile, AI providers, and account settings." />
      <div className="container mx-auto px-4 md:px-8 max-w-3xl py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile, AI providers, and account.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-1.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Cpu className="w-4 h-4 mr-1.5" />
              AI Providers
              {activeProvider && (
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">
                  {activeProvider}
                </span>
              )}
            </TabsTrigger>
            {!isGoogleOnly && (
              <TabsTrigger value="security">
                <Shield className="w-4 h-4 mr-1.5" />
                Security
              </TabsTrigger>
            )}
            <TabsTrigger value="account">
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ─────────────────────────────────────────── */}
          <TabsContent value="profile">
            <Card className="border-white/[0.07] glass-card-md shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  Profile
                </CardTitle>
                <CardDescription>Update your display name and avatar. Your email address cannot be changed.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/photo.jpg" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">Paste a publicly accessible image URL. Leave blank to use your initials.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <label className="text-sm font-medium">Email address</label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Input
                          value={meData?.email ?? ""}
                          disabled
                          className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                        />
                        {isGoogleOnly && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">via Google</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">Email changes are not supported at this time.</p>
                    </div>
                    <Button
                      type="submit"
                      disabled={isSavingProfile}
                      className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                    >
                      {isSavingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save profile"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AI Providers Tab ────────────────────────────────────── */}
          <TabsContent value="ai" className="space-y-6">
            {/* Active provider indicator */}
            <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/[0.05]">
              <Cpu className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Active provider: <span className="capitalize text-blue-600 dark:text-blue-400">{activeProvider}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All AI features (brand scanning, content generation, SEO) use this provider.
                  Configure via the <code className="px-1 py-0.5 rounded bg-muted text-xs">AI_PROVIDER</code> env var.
                </p>
              </div>
            </div>

            {/* Gemini */}
            <Card className="border-white/[0.07] glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="text-blue-500 dark:text-blue-400 font-bold text-lg">G</span>
                      Google Gemini
                    </CardTitle>
                    <CardDescription>
                      Bring your own API key to route AI generation through your Gemini account.
                      Your key is stored encrypted and never exposed.
                    </CardDescription>
                  </div>
                  {activeProvider === "gemini" && (
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                      Active
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {hasGeminiKey ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Gemini API key connected</p>
                        <p className="text-xs text-muted-foreground">Ending in ••••{geminiKeyLastFour ?? "••••"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiKeyDialogOpen(true); }}
                      >
                        Replace key
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRemoveGeminiKey}
                        disabled={isDeletingGeminiKey}
                        className="border-red-400/30 text-red-500 dark:text-red-400 hover:bg-red-400/10 hover:text-red-500 dark:hover:text-red-400 hover:border-red-400/50"
                      >
                        {isDeletingGeminiKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No key connected. Generations use the platform's shared quota (if available).
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiKeyDialogOpen(true); }}
                    >
                      <KeyRound className="mr-2 h-3.5 w-3.5" />
                      Add Gemini API key
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Get a free key at{" "}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-400 hover:underline"
                      >
                        aistudio.google.com
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AWS Bedrock */}
            <Card className="border-white/[0.07] glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Cloud className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      AWS Bedrock
                    </CardTitle>
                    <CardDescription>
                      Use Claude, Llama, or other models via AWS Bedrock. Requires AWS credentials configured on the server.
                    </CardDescription>
                  </div>
                  {activeProvider === "bedrock" && (
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                      Active
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {aiStatus?.bedrock.configured ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Bedrock configured</p>
                        <p className="text-xs text-muted-foreground">
                          Region: {aiStatus.bedrock.region ?? "us-east-1"} · Model: {aiStatus.bedrock.model ?? "default"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">Not configured on this server</p>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1.5">
                      <p>To enable Bedrock, add these env vars to your server:</p>
                      <pre className="p-2 rounded bg-muted text-xs overflow-x-auto"><code>{`AI_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL=anthropic.claude-3-5-haiku-20241022-v1:0`}</code></pre>
                      <p>Then install the SDK: <code className="px-1 py-0.5 rounded bg-muted">pnpm add -D @aws-sdk/client-bedrock-runtime</code></p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ollama */}
            <Card className="border-white/[0.07] glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      Ollama (Local)
                    </CardTitle>
                    <CardDescription>
                      Run open-source models locally. Free and private — no API key needed.
                    </CardDescription>
                  </div>
                  {activeProvider === "ollama" && (
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                      Active
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {aiStatus?.ollama.configured ? (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${aiStatus.ollama.reachable ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                      {aiStatus.ollama.reachable ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${aiStatus.ollama.reachable ? "text-green-800 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                          {aiStatus.ollama.reachable ? "Ollama connected" : "Ollama unreachable"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          URL: {aiStatus.ollama.baseUrl ?? "http://localhost:11434"} · Model: {aiStatus.ollama.model ?? "default"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">Not configured on this server</p>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1.5">
                      <p>To enable Ollama, add these env vars:</p>
                      <pre className="p-2 rounded bg-muted text-xs overflow-x-auto"><code>{`AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1`}</code></pre>
                      <p>Then install Ollama from{" "}
                        <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">ollama.com</a>
                        {" "}and pull a model: <code className="px-1 py-0.5 rounded bg-muted">ollama pull llama3.1</code></p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Security Tab ───────────────────────────────────────── */}
          {!isGoogleOnly && (
            <TabsContent value="security">
              <Card className="border-white/[0.07] glass-card-md shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    Change password
                  </CardTitle>
                  <CardDescription>Choose a strong password with at least 8 characters.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm new password</FormLabel>
                            <FormControl>
                              <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        disabled={isSavingPassword}
                        className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                      >
                        {isSavingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</> : "Update password"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Account Tab ────────────────────────────────────────── */}
          <TabsContent value="account">
            <Card className="border-red-400/20 glass-card-md shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  Danger zone
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data. This cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/50"
                  onClick={() => {
                    setDeleteConfirmEmail("");
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete my account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Gemini key dialog */}
      <Dialog open={geminiKeyDialogOpen} onOpenChange={setGeminiKeyDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              {hasGeminiKey ? "Replace Gemini API Key" : "Add Gemini API Key"}
            </DialogTitle>
            <DialogDescription>
              Your key is encrypted with AES-256 before storage and never logged or exposed. It's used only to route AI generation requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">API Key</label>
              <Input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => { setGeminiKeyInput(e.target.value); setGeminiTestResult(null); }}
                placeholder="AIza…"
                className="font-mono"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Get a free key at{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 dark:text-blue-400 hover:underline"
                >
                  aistudio.google.com
                </a>
              </p>
            </div>

            {geminiTestResult === "ok" && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-green-500/10 border border-green-500/20 text-sm text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Key is valid and working
              </div>
            )}
            {geminiTestResult === "error" && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-700 dark:text-red-300">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{geminiTestError ?? "Key validation failed"}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={onTestGeminiKey}
              disabled={!geminiKeyInput.trim() || isTestingGeminiKey || isSavingGeminiKey}
            >
              {isTestingGeminiKey ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testing…</> : "Test key"}
            </Button>
            <Button
              onClick={onSaveGeminiKey}
              disabled={!geminiKeyInput.trim() || isSavingGeminiKey || isTestingGeminiKey}
              className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
            >
              {isSavingGeminiKey ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your website projects, brand profiles, and generated content.
              <strong className="text-foreground block mt-3">This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Type your email address <span className="font-mono text-foreground font-medium">{user?.email}</span> to confirm:
            </p>
            <Input
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user?.email ?? ""}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteAccount}
              disabled={
                isDeletingAccount ||
                deleteConfirmEmail.trim().toLowerCase() !== (user?.email ?? "").toLowerCase()
              }
            >
              {isDeletingAccount ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
