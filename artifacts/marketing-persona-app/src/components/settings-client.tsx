"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Cloud,
  BarChart3,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrgSecurityPanel } from "@/components/org-security-panel";
import { useActiveProject } from "@/context/active-project";
import {
  contentLanguageLabel,
  semrushDatabaseForLanguage,
  semrushDatabaseLabel,
} from "@workspace/content-engine/support/content-language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsBillingPanel } from "@/components/settings-billing-panel";

const profileSchema = z.object({
  name: z.string().min(1),
  avatarUrl: z.union([z.string().url("Must be a valid URL"), z.literal("")]).optional(),
});
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

const PLAN_LABELS: Record<UsageSummary["plan"], string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

interface AiProviderStatus {
  activeProvider: string;
  source: "app" | "env" | "auto";
  settings: {
    provider: string | null;
    ollamaBaseUrl: string | null;
    ollamaModel: string | null;
  };
  envFallback: {
    provider: string | null;
    ollamaBaseUrl: string | null;
    ollamaModel: string | null;
  };
  gemini: { configured: boolean; source: string | null };
  bedrock: {
    configured: boolean;
    region: string | null;
    model: string | null;
    source: string | null;
  };
  ollama: { configured: boolean; baseUrl: string; model: string; reachable: boolean };
}

type AiProviderChoice = "gemini" | "bedrock" | "ollama";

function normalizeProviderChoice(value: string | null | undefined): AiProviderChoice {
  if (value === "bedrock") return "bedrock";
  if (value === "ollama") return "ollama";
  return "gemini";
}

interface BedrockCredentialsForm {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  region: string;
  model: string;
}

const DEFAULT_BEDROCK_MODEL = "anthropic.claude-3-5-haiku-20241022-v1:0";

const SEMRUSH_DATABASES = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
] as const;

interface SettingsClientProps {
  initialData?: import("@/lib/server/loaders").SettingsInitialData;
}

export function SettingsClient({ initialData }: SettingsClientProps) {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const { activeProject } = useActiveProject();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") ?? "profile");
  const [usage, setUsage] = useState<UsageSummary | null>(initialData?.usage ?? null);
  const [usageLoading, setUsageLoading] = useState(!initialData);
  const [hasGeminiKey, setHasGeminiKey] = useState(initialData?.me?.hasGeminiKey ?? false);
  const [geminiLastFour, setGeminiLastFour] = useState<string | null>(
    initialData?.apiKey.lastFour ?? null,
  );
  const [hasGoogleId, setHasGoogleId] = useState(initialData?.me?.hasGoogleId ?? false);
  const [hasPassword, setHasPassword] = useState(initialData?.me?.hasPassword ?? false);
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(initialData?.aiStatus ?? null);
  const [geminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [hasBedrockCredentials, setHasBedrockCredentials] = useState(
    initialData?.bedrockCredentials.hasCredentials ?? false,
  );
  const [bedrockAccessKeyLastFour, setBedrockAccessKeyLastFour] = useState<string | null>(
    initialData?.bedrockCredentials.accessKeyLastFour ?? null,
  );
  const [bedrockRegion, setBedrockRegion] = useState(
    initialData?.bedrockCredentials.region ?? "us-east-1",
  );
  const [bedrockModel, setBedrockModel] = useState(
    initialData?.bedrockCredentials.model ?? DEFAULT_BEDROCK_MODEL,
  );
  const [bedrockDialogOpen, setBedrockDialogOpen] = useState(false);
  const [bedrockForm, setBedrockForm] = useState<BedrockCredentialsForm>({
    accessKeyId: "",
    secretAccessKey: "",
    sessionToken: "",
    region: "us-east-1",
    model: DEFAULT_BEDROCK_MODEL,
  });
  const [bedrockTesting, setBedrockTesting] = useState(false);
  const [bedrockTestResult, setBedrockTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [bedrockSaving, setBedrockSaving] = useState(false);
  const [deletingBedrock, setDeletingBedrock] = useState(false);
  const [hasSemrushCredentials, setHasSemrushCredentials] = useState(
    initialData?.semrushCredentials.hasCredentials ?? false,
  );
  const [semrushApiKeyLastFour, setSemrushApiKeyLastFour] = useState<string | null>(
    initialData?.semrushCredentials.apiKeyLastFour ?? null,
  );
  const [semrushDatabase, setSemrushDatabase] = useState(
    initialData?.semrushCredentials.database ?? "us",
  );
  const [semrushDialogOpen, setSemrushDialogOpen] = useState(false);
  const [semrushApiKeyInput, setSemrushApiKeyInput] = useState("");
  const [semrushFormDatabase, setSemrushFormDatabase] = useState("us");
  const [semrushTesting, setSemrushTesting] = useState(false);
  const [semrushTestResult, setSemrushTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [semrushSaving, setSemrushSaving] = useState(false);
  const [deletingSemrush, setDeletingSemrush] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AiProviderChoice>(() => {
    if (!initialData?.aiStatus) return "gemini";
    const saved = initialData.aiStatus.settings?.provider;
    return normalizeProviderChoice(saved ?? initialData.aiStatus.activeProvider);
  });
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(
    initialData?.aiStatus?.settings?.ollamaBaseUrl ??
      initialData?.aiStatus?.envFallback?.ollamaBaseUrl ??
      "http://localhost:11434",
  );
  const [ollamaModel, setOllamaModel] = useState(
    initialData?.aiStatus?.settings?.ollamaModel ??
      initialData?.aiStatus?.envFallback?.ollamaModel ??
      "",
  );
  const [providerSaving, setProviderSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingKey, setDeletingKey] = useState(false);
  const canManageAiSettings =
    initialData?.canManageAiSettings ??
    (session?.user?.orgRole === "site_admin" ||
      session?.user?.orgRole === "owner" ||
      session?.user?.role === "super_admin" ||
      session?.user?.role === "admin");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      name: session?.user.name ?? "",
      avatarUrl: session?.user.image ?? "",
    },
  });
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  useEffect(() => {
    if (initialData) return;
    Promise.all([
      fetch("/api/usage").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/api-key").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/bedrock-credentials").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/semrush-credentials").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ai-providers/status").then((r) => (r.ok ? r.json() : null)),
    ]).then(([usageData, meData, keyData, bedrockData, semrushData, aiData]) => {
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
      if (bedrockData?.hasCredentials) {
        setHasBedrockCredentials(true);
        setBedrockAccessKeyLastFour(bedrockData.accessKeyLastFour ?? null);
        setBedrockRegion(bedrockData.region ?? "us-east-1");
        setBedrockModel(bedrockData.model ?? DEFAULT_BEDROCK_MODEL);
      }
      if (semrushData?.hasCredentials) {
        setHasSemrushCredentials(true);
        setSemrushApiKeyLastFour(semrushData.apiKeyLastFour ?? null);
        setSemrushDatabase(semrushData.database ?? "us");
      } else if (semrushData?.database) {
        setSemrushDatabase(semrushData.database);
      }
      if (aiData) {
        setAiStatus(aiData);
        const savedProvider = aiData.settings?.provider;
        setSelectedProvider(normalizeProviderChoice(savedProvider ?? aiData.activeProvider));
        setOllamaBaseUrl(
          aiData.settings?.ollamaBaseUrl ??
            aiData.envFallback?.ollamaBaseUrl ??
            "http://localhost:11434",
        );
        setOllamaModel(
          aiData.settings?.ollamaModel ?? aiData.envFallback?.ollamaModel ?? "",
        );
      }
      setUsageLoading(false);
    });
  }, [initialData]);

  async function saveProfile(data: { name: string; avatarUrl?: string }) {
    const payload: { name: string; avatarUrl?: string | null } = { name: data.name };
    if (data.avatarUrl !== undefined) {
      payload.avatarUrl = data.avatarUrl === "" ? null : data.avatarUrl;
    }
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { toast.error("Failed to save"); return; }
    const body = (await res.json()) as { user?: { name?: string; avatarUrl?: string | null } };
    const avatarUrl = body.user?.avatarUrl ?? (data.avatarUrl === "" ? undefined : data.avatarUrl);
    await update({ name: data.name, image: avatarUrl ?? undefined });
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

  function openBedrockDialog() {
    setBedrockForm({
      accessKeyId: "",
      secretAccessKey: "",
      sessionToken: "",
      region: bedrockRegion || "us-east-1",
      model: bedrockModel || DEFAULT_BEDROCK_MODEL,
    });
    setBedrockTestResult(null);
    setBedrockDialogOpen(true);
  }

  function bedrockPayloadFromForm() {
    return {
      accessKeyId: bedrockForm.accessKeyId.trim(),
      secretAccessKey: bedrockForm.secretAccessKey.trim(),
      sessionToken: bedrockForm.sessionToken.trim() || null,
      region: bedrockForm.region.trim(),
      model: bedrockForm.model.trim(),
    };
  }

  async function testBedrockCredentials() {
    const payload = bedrockPayloadFromForm();
    if (!payload.accessKeyId || !payload.secretAccessKey || !payload.region || !payload.model) return;
    setBedrockTesting(true);
    setBedrockTestResult(null);
    const res = await fetch("/api/auth/bedrock-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBedrockTestResult(await res.json());
    setBedrockTesting(false);
  }

  async function saveBedrockCredentials() {
    const payload = bedrockPayloadFromForm();
    if (!payload.accessKeyId || !payload.secretAccessKey || !payload.region || !payload.model) return;
    setBedrockSaving(true);
    const res = await fetch("/api/auth/bedrock-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBedrockSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save Bedrock credentials");
      return;
    }
    const data = await res.json();
    setHasBedrockCredentials(true);
    setBedrockAccessKeyLastFour(data.accessKeyLastFour ?? payload.accessKeyId.slice(-4));
    setBedrockRegion(data.region ?? payload.region);
    setBedrockModel(data.model ?? payload.model);
    setBedrockDialogOpen(false);
    toast.success("AWS Bedrock credentials saved");
    const statusRes = await fetch("/api/ai-providers/status");
    if (statusRes.ok) setAiStatus(await statusRes.json());
  }

  async function removeBedrockCredentials() {
    setDeletingBedrock(true);
    const res = await fetch("/api/auth/bedrock-credentials", { method: "DELETE" });
    setDeletingBedrock(false);
    if (!res.ok) { toast.error("Failed to remove Bedrock credentials"); return; }
    setHasBedrockCredentials(false);
    setBedrockAccessKeyLastFour(null);
    toast.success("Bedrock credentials removed");
    const statusRes = await fetch("/api/ai-providers/status");
    if (statusRes.ok) setAiStatus(await statusRes.json());
  }

  function openSemrushDialog() {
    setSemrushApiKeyInput("");
    const suggested = semrushDatabaseForLanguage(activeProject?.primaryLanguage);
    setSemrushFormDatabase(suggested ?? (semrushDatabase || "us"));
    setSemrushTestResult(null);
    setSemrushDialogOpen(true);
  }

  const suggestedSemrushDatabase = semrushDatabaseForLanguage(activeProject?.primaryLanguage);
  const showSemrushDatabaseHint =
    Boolean(suggestedSemrushDatabase) &&
    suggestedSemrushDatabase !== semrushFormDatabase &&
    Boolean(activeProject?.primaryLanguage) &&
    activeProject?.primaryLanguage !== "en";

  async function testSemrushCredentials() {
    if (!semrushApiKeyInput.trim()) return;
    setSemrushTesting(true);
    setSemrushTestResult(null);
    const res = await fetch("/api/auth/semrush-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: semrushApiKeyInput.trim(),
        database: semrushFormDatabase,
      }),
    });
    setSemrushTestResult(await res.json());
    setSemrushTesting(false);
  }

  async function saveSemrushCredentials() {
    if (!semrushApiKeyInput.trim()) return;
    setSemrushSaving(true);
    const res = await fetch("/api/auth/semrush-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: semrushApiKeyInput.trim(),
        database: semrushFormDatabase,
      }),
    });
    setSemrushSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save Semrush credentials");
      return;
    }
    const data = await res.json();
    setHasSemrushCredentials(true);
    setSemrushApiKeyLastFour(data.apiKeyLastFour ?? semrushApiKeyInput.slice(-4));
    setSemrushDatabase(data.database ?? semrushFormDatabase);
    setSemrushDialogOpen(false);
    toast.success("Semrush API key saved");
  }

  async function removeSemrushCredentials() {
    setDeletingSemrush(true);
    const res = await fetch("/api/auth/semrush-credentials", { method: "DELETE" });
    setDeletingSemrush(false);
    if (!res.ok) { toast.error("Failed to remove Semrush credentials"); return; }
    setHasSemrushCredentials(false);
    setSemrushApiKeyLastFour(null);
    toast.success("Semrush credentials removed");
  }

  async function saveAiProvider() {
    setProviderSaving(true);
    const res = await fetch("/api/ai-providers/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: selectedProvider,
        ollamaBaseUrl: selectedProvider === "ollama" ? ollamaBaseUrl : null,
        ollamaModel: selectedProvider === "ollama" ? ollamaModel : null,
      }),
    });
    setProviderSaving(false);
    if (!res.ok) {
      toast.error("Failed to save AI provider");
      return;
    }
    const data = await res.json();
    setAiStatus(data);
    toast.success("AI provider updated");
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
        <p className="text-muted-foreground mt-1 text-sm">Manage your profile, organization AI settings, and account.</p>
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
          <TabsTrigger value="billing"><CreditCard className="w-4 h-4 mr-1.5" />Billing</TabsTrigger>
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
            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                placeholder="https://example.com/photo.jpg"
                {...profileForm.register("avatarUrl")}
              />
              <p className="text-xs text-muted-foreground">
                Paste a publicly accessible image URL. Leave blank to use your initials.
              </p>
            </div>
            <Button onClick={profileForm.handleSubmit(saveProfile)}>Save changes</Button>
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold">Usage this month</h2>
            {usageLoading && <p className="text-sm text-muted-foreground">Loading usage…</p>}
            {usage && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Articles</p>
                  <p className="text-2xl font-bold">{usage.articlesThisMonth}</p>
                  {!usage.usesByok && usage.quota != null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {usage.quotaRemaining ?? 0} of {usage.quota} remaining (platform key)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Plan</p>
                  <p className="text-2xl font-bold">{PLAN_LABELS[usage.plan]}</p>
                </div>
                {usage.usesByok && (
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs text-muted-foreground uppercase">AI key</p>
                    <p className="text-sm font-medium flex items-center gap-1.5 mt-1">
                      <KeyRound className="h-4 w-4 text-primary" />
                      BYOK — unlimited
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <div className="paper-card p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Cpu className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="font-semibold">Active AI provider</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose which provider powers generation for your organization. All projects in your org share this setting.
                    {!canManageAiSettings && " Only site admins can change these settings."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ai-provider">Provider</Label>
                  <Select
                    value={selectedProvider}
                    onValueChange={(value) => setSelectedProvider(value as AiProviderChoice)}
                    disabled={!canManageAiSettings}
                  >
                    <SelectTrigger id="ai-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="bedrock">AWS Bedrock</SelectItem>
                      <SelectItem value="ollama">Ollama (local)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedProvider === "ollama" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ollama-url">Ollama URL</Label>
                      <Input
                        id="ollama-url"
                        value={ollamaBaseUrl}
                        onChange={(e) => setOllamaBaseUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                        disabled={!canManageAiSettings}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ollama-model">Model</Label>
                      <Input
                        id="ollama-model"
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        placeholder={aiStatus?.envFallback?.ollamaModel ?? "gemma4:e2b"}
                        disabled={!canManageAiSettings}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      Currently using: <span className="capitalize text-primary">{activeProvider}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Source: {aiStatus?.source === "app" ? "organization settings" : aiStatus?.source === "env" ? "environment fallback" : "auto-detected"}
                    </p>
                  </div>
                  {canManageAiSettings && (
                    <Button onClick={saveAiProvider} disabled={providerSaving}>
                      {providerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save provider"}
                    </Button>
                  )}
                </div>

                {aiStatus?.envFallback?.provider && !aiStatus.settings.provider && (
                  <p className="text-xs text-muted-foreground">
                    Env fallback: <code className="px-1 py-0.5 rounded bg-muted">AI_PROVIDER={aiStatus.envFallback.provider}</code>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold">Google Gemini (BYOK)</h2>
            <p className="text-sm text-muted-foreground">
              Bring your own API key to route AI generation for your entire organization through your Gemini account.
              {!canManageAiSettings && " Only site admins can manage the API key."}
            </p>
            {hasGeminiKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Organization Gemini API key connected</p>
                    <p className="text-xs text-muted-foreground">Ending in ••••{geminiLastFour ?? "••••"}</p>
                  </div>
                </div>
                {canManageAiSettings && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiDialogOpen(true); }}>
                      Replace key
                    </Button>
                    <Button variant="outline" size="sm" onClick={removeGeminiKey} disabled={deletingKey}>
                      {deletingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                    </Button>
                  </div>
                )}
              </div>
            ) : canManageAiSettings ? (
              <Button variant="outline" size="sm" onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiDialogOpen(true); }}>
                <KeyRound className="mr-2 h-3.5 w-3.5" />Add Gemini API key
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No organization API key configured.</p>
            )}
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Cloud className="w-4 h-4 text-amber-500" />
              AWS Bedrock (BYOK)
            </h2>
            <p className="text-sm text-muted-foreground">
              Bring your own AWS IAM credentials to run Claude and other Bedrock models through your AWS account.
              {!canManageAiSettings && " Only site admins can manage Bedrock credentials."}
            </p>
            {hasBedrockCredentials ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Organization Bedrock credentials connected</p>
                    <p className="text-xs text-muted-foreground">
                      Access key ending in ••••{bedrockAccessKeyLastFour ?? "••••"}
                      {bedrockRegion ? ` · ${bedrockRegion}` : ""}
                      {bedrockModel ? ` · ${bedrockModel}` : ""}
                    </p>
                  </div>
                </div>
                {canManageAiSettings && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openBedrockDialog}>
                      Replace credentials
                    </Button>
                    <Button variant="outline" size="sm" onClick={removeBedrockCredentials} disabled={deletingBedrock}>
                      {deletingBedrock ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove credentials"}
                    </Button>
                  </div>
                )}
              </div>
            ) : canManageAiSettings ? (
              <Button variant="outline" size="sm" onClick={openBedrockDialog}>
                <KeyRound className="mr-2 h-3.5 w-3.5" />Add Bedrock credentials
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No organization Bedrock credentials configured.</p>
            )}
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              Semrush (BYOK)
            </h2>
            <p className="text-sm text-muted-foreground">
              Connect your Semrush API key to pull keyword gaps, search volume, and difficulty into content suggestions.
              {!canManageAiSettings && " Only site admins can manage Semrush credentials."}
            </p>
            {hasSemrushCredentials ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Organization Semrush API key connected</p>
                    <p className="text-xs text-muted-foreground">
                      Key ending in ••••{semrushApiKeyLastFour ?? "••••"}
                      {semrushDatabase ? ` · database: ${semrushDatabaseLabel(semrushDatabase)}` : ""}
                    </p>
                  </div>
                </div>
                {canManageAiSettings && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openSemrushDialog}>
                      Replace key
                    </Button>
                    <Button variant="outline" size="sm" onClick={removeSemrushCredentials} disabled={deletingSemrush}>
                      {deletingSemrush ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                    </Button>
                  </div>
                )}
              </div>
            ) : canManageAiSettings ? (
              <Button variant="outline" size="sm" onClick={openSemrushDialog}>
                <KeyRound className="mr-2 h-3.5 w-3.5" />Add Semrush API key
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No organization Semrush credentials configured.</p>
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
                <span>Bedrock</span>
                <span className={aiStatus.bedrock.configured ? "text-emerald-600" : "text-muted-foreground"}>
                  {aiStatus.bedrock.configured
                    ? `Configured (${aiStatus.bedrock.source ?? "env"})`
                    : "Not configured"}
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

        <TabsContent value="security" className="space-y-6">
          <OrgSecurityPanel canManage={canManageAiSettings} />
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

        <TabsContent value="billing" className="space-y-6">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading billing…</p>}>
            <SettingsBillingPanel />
          </Suspense>
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

      <Dialog open={bedrockDialogOpen} onOpenChange={setBedrockDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>AWS Bedrock credentials</DialogTitle>
            <DialogDescription>
              Credentials are encrypted and stored securely. Use an IAM user with Bedrock invoke permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bedrock-access-key-id">Access key ID</Label>
              <Input
                id="bedrock-access-key-id"
                type="password"
                placeholder="AKIA..."
                value={bedrockForm.accessKeyId}
                onChange={(e) => setBedrockForm((prev) => ({ ...prev, accessKeyId: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedrock-secret-access-key">Secret access key</Label>
              <Input
                id="bedrock-secret-access-key"
                type="password"
                placeholder="Secret key"
                value={bedrockForm.secretAccessKey}
                onChange={(e) => setBedrockForm((prev) => ({ ...prev, secretAccessKey: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedrock-session-token">Session token (optional)</Label>
              <Input
                id="bedrock-session-token"
                type="password"
                placeholder="For temporary credentials"
                value={bedrockForm.sessionToken}
                onChange={(e) => setBedrockForm((prev) => ({ ...prev, sessionToken: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bedrock-region">Region</Label>
                <Input
                  id="bedrock-region"
                  placeholder="us-east-1"
                  value={bedrockForm.region}
                  onChange={(e) => setBedrockForm((prev) => ({ ...prev, region: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bedrock-model">Model ID</Label>
                <Input
                  id="bedrock-model"
                  placeholder={DEFAULT_BEDROCK_MODEL}
                  value={bedrockForm.model}
                  onChange={(e) => setBedrockForm((prev) => ({ ...prev, model: e.target.value }))}
                />
              </div>
            </div>
            {bedrockTestResult && (
              <div className={`flex items-center gap-2 text-sm ${bedrockTestResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {bedrockTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {bedrockTestResult.ok ? "Credentials are valid" : bedrockTestResult.error ?? "Credential test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={testBedrockCredentials}
                disabled={
                  bedrockTesting ||
                  !bedrockForm.accessKeyId.trim() ||
                  !bedrockForm.secretAccessKey.trim() ||
                  !bedrockForm.region.trim() ||
                  !bedrockForm.model.trim()
                }
              >
                {bedrockTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test credentials"}
              </Button>
              <Button
                onClick={saveBedrockCredentials}
                disabled={
                  bedrockSaving ||
                  !bedrockForm.accessKeyId.trim() ||
                  !bedrockForm.secretAccessKey.trim() ||
                  !bedrockForm.region.trim() ||
                  !bedrockForm.model.trim()
                }
              >
                {bedrockSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={semrushDialogOpen} onOpenChange={setSemrushDialogOpen}>
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
                value={semrushApiKeyInput}
                onChange={(e) => setSemrushApiKeyInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="semrush-database">Regional database</Label>
              <Select value={semrushFormDatabase} onValueChange={setSemrushFormDatabase}>
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
              {showSemrushDatabaseHint && suggestedSemrushDatabase && (
                <p className="text-xs text-muted-foreground">
                  Suggested for your active project&apos;s language (
                  {contentLanguageLabel(activeProject?.primaryLanguage)}):{" "}
                  {semrushDatabaseLabel(suggestedSemrushDatabase)}
                </p>
              )}
            </div>
            {semrushTestResult && (
              <div className={`flex items-center gap-2 text-sm ${semrushTestResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {semrushTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {semrushTestResult.ok ? "API key is valid" : semrushTestResult.error ?? "Key test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={testSemrushCredentials}
                disabled={semrushTesting || !semrushApiKeyInput.trim()}
              >
                {semrushTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test key"}
              </Button>
              <Button onClick={saveSemrushCredentials} disabled={semrushSaving || !semrushApiKeyInput.trim()}>
                {semrushSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
