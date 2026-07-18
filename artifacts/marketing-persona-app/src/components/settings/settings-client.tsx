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
import { OrgSecurityPanel } from "@/components/org/org-security-panel";
import { MfaSettingsPanel } from "@/components/mfa/mfa-settings-panel";
import { StockByokPanel } from "@/components/settings/stock-byok-panel";
import { DeeplByokPanel } from "@/components/settings/deepl-byok-panel";
import { PublicApiKeysPanel } from "@/components/settings/public-api-keys-panel";
import { useActiveProject } from "@/context/use-active-project";
import {
  contentLanguageLabel,
  semrushDatabaseForLanguage,
  semrushDatabaseLabel,
} from "@workspace/content-engine/support/content/content-language";
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
import { SettingsBillingPanel } from "@/components/settings/settings-billing-panel";
import { SettingsApiKeyDialogs } from "@/components/settings/settings-api-key-dialogs";
import { useBedrockAccountModels } from "@/hooks/use-bedrock-account-models";
import { BEDROCK_MODEL_CUSTOM } from "@workspace/ai-providers/bedrock-models";

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

type AiProviderChoice = "gemini" | "bedrock" | "ollama" | "openai" | "anthropic";

function normalizeProviderChoice(value: string | null | undefined): AiProviderChoice {
  if (value === "bedrock") return "bedrock";
  if (value === "ollama") return "ollama";
  if (value === "openai") return "openai";
  if (value === "anthropic") return "anthropic";
  return "gemini";
}

interface BedrockCredentialsForm {
  apiKey: string;
  model: string;
}

interface SettingsClientProps {
  initialData?: import("@/lib/server/loaders").SettingsInitialData;
}

export function SettingsClient({ initialData }: SettingsClientProps) {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const { activeProject } = useActiveProject();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") ?? "profile");
  useEffect(() => {
    if (searchParams.get("tab") === "ai") {
      window.location.replace("/integrations/ai");
    }
  }, [searchParams]);
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
  const [hasOpenAIKey, setHasOpenAIKey] = useState(initialData?.openaiCredentials.hasKey ?? false);
  const [openaiLastFour, setOpenaiLastFour] = useState<string | null>(
    initialData?.openaiCredentials.lastFour ?? null,
  );
  const [openaiDialogOpen, setOpenaiDialogOpen] = useState(false);
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [openaiTesting, setOpenaiTesting] = useState(false);
  const [openaiTestResult, setOpenaiTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [openaiSaving, setOpenaiSaving] = useState(false);
  const [deletingOpenAIKey, setDeletingOpenAIKey] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(initialData?.anthropicCredentials.hasKey ?? false);
  const [anthropicLastFour, setAnthropicLastFour] = useState<string | null>(
    initialData?.anthropicCredentials.lastFour ?? null,
  );
  const [anthropicDialogOpen, setAnthropicDialogOpen] = useState(false);
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("");
  const [anthropicTesting, setAnthropicTesting] = useState(false);
  const [anthropicTestResult, setAnthropicTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [anthropicSaving, setAnthropicSaving] = useState(false);
  const [deletingAnthropicKey, setDeletingAnthropicKey] = useState(false);
  const [hasBedrockCredentials, setHasBedrockCredentials] = useState(
    initialData?.bedrockCredentials.hasCredentials ?? false,
  );
  const [bedrockAccessKeyLastFour, setBedrockAccessKeyLastFour] = useState<string | null>(
    initialData?.bedrockCredentials.accessKeyLastFour ?? null,
  );
  const [bedrockOrgModel, setBedrockOrgModel] = useState<string>(
    initialData?.bedrockCredentials.model ?? "",
  );
  const [bedrockModelDraft, setBedrockModelDraft] = useState(
    initialData?.bedrockCredentials.model ?? "",
  );
  const [bedrockModelSaving, setBedrockModelSaving] = useState(false);
  const [bedrockDialogOpen, setBedrockDialogOpen] = useState(false);
  const [bedrockForm, setBedrockForm] = useState<BedrockCredentialsForm>({ apiKey: "", model: "" });
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

  const {
    models: bedrockOrgModels,
    loading: bedrockOrgModelsLoading,
    error: bedrockOrgModelsError,
  } = useBedrockAccountModels("", hasBedrockCredentials && Boolean(canManageAiSettings));
  const bedrockOrgKnownIds = new Set(bedrockOrgModels.map((m) => m.id));

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
      fetch("/api/auth/openai-credentials").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/anthropic-credentials").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/bedrock-credentials").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/semrush-credentials").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ai-providers/status").then((r) => (r.ok ? r.json() : null)),
    ]).then(([usageData, meData, keyData, openaiData, anthropicData, bedrockData, semrushData, aiData]) => {
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
      if (openaiData?.hasKey) {
        setHasOpenAIKey(true);
        setOpenaiLastFour(openaiData.lastFour ?? null);
      }
      if (anthropicData?.hasKey) {
        setHasAnthropicKey(true);
        setAnthropicLastFour(anthropicData.lastFour ?? null);
      }
      if (bedrockData?.hasCredentials) {
        setHasBedrockCredentials(true);
        setBedrockAccessKeyLastFour(bedrockData.accessKeyLastFour ?? null);
      }
      if (bedrockData?.model) {
        setBedrockOrgModel(bedrockData.model);
        setBedrockModelDraft(bedrockData.model);
      } else if (aiData?.bedrock?.model) {
        setBedrockOrgModel(aiData.bedrock.model);
        setBedrockModelDraft(aiData.bedrock.model);
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

  async function testOpenAIKey() {
    if (!openaiKeyInput.trim()) return;
    setOpenaiTesting(true);
    setOpenaiTestResult(null);
    const res = await fetch("/api/auth/openai-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: openaiKeyInput }),
    });
    setOpenaiTestResult(await res.json());
    setOpenaiTesting(false);
  }

  async function saveOpenAIKey() {
    if (!openaiKeyInput.trim()) return;
    setOpenaiSaving(true);
    const res = await fetch("/api/auth/openai-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: openaiKeyInput }),
    });
    setOpenaiSaving(false);
    if (!res.ok) { toast.error("Failed to save key"); return; }
    const data = await res.json();
    setHasOpenAIKey(true);
    setOpenaiLastFour(data.lastFour ?? openaiKeyInput.slice(-4));
    setOpenaiDialogOpen(false);
    setOpenaiKeyInput("");
    toast.success("OpenAI API key saved");
    const statusRes = await fetch("/api/ai-providers/status");
    if (statusRes.ok) setAiStatus(await statusRes.json());
  }

  async function removeOpenAIKey() {
    setDeletingOpenAIKey(true);
    const res = await fetch("/api/auth/openai-credentials", { method: "DELETE" });
    setDeletingOpenAIKey(false);
    if (!res.ok) { toast.error("Failed to remove key"); return; }
    setHasOpenAIKey(false);
    setOpenaiLastFour(null);
    toast.success("OpenAI API key removed");
    const statusRes = await fetch("/api/ai-providers/status");
    if (statusRes.ok) setAiStatus(await statusRes.json());
  }

  async function testAnthropicKey() {
    if (!anthropicKeyInput.trim()) return;
    setAnthropicTesting(true);
    setAnthropicTestResult(null);
    const res = await fetch("/api/auth/anthropic-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: anthropicKeyInput }),
    });
    setAnthropicTestResult(await res.json());
    setAnthropicTesting(false);
  }

  async function saveAnthropicKey() {
    if (!anthropicKeyInput.trim()) return;
    setAnthropicSaving(true);
    const res = await fetch("/api/auth/anthropic-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: anthropicKeyInput }),
    });
    setAnthropicSaving(false);
    if (!res.ok) { toast.error("Failed to save key"); return; }
    const data = await res.json();
    setHasAnthropicKey(true);
    setAnthropicLastFour(data.lastFour ?? anthropicKeyInput.slice(-4));
    setAnthropicDialogOpen(false);
    setAnthropicKeyInput("");
    toast.success("Anthropic API key saved");
    const statusRes = await fetch("/api/ai-providers/status");
    if (statusRes.ok) setAiStatus(await statusRes.json());
  }

  async function removeAnthropicKey() {
    setDeletingAnthropicKey(true);
    const res = await fetch("/api/auth/anthropic-credentials", { method: "DELETE" });
    setDeletingAnthropicKey(false);
    if (!res.ok) { toast.error("Failed to remove key"); return; }
    setHasAnthropicKey(false);
    setAnthropicLastFour(null);
    toast.success("Anthropic API key removed");
    const statusRes = await fetch("/api/ai-providers/status");
    if (statusRes.ok) setAiStatus(await statusRes.json());
  }

  function openBedrockDialog() {
    setBedrockForm({ apiKey: "", model: bedrockOrgModel });
    setBedrockTestResult(null);
    setBedrockDialogOpen(true);
  }

  function bedrockPayloadFromForm() {
    return { apiKey: bedrockForm.apiKey.trim(), model: bedrockForm.model.trim() };
  }

  async function testBedrockCredentials() {
    const payload = bedrockPayloadFromForm();
    if (!payload.apiKey) return;
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
    if (!payload.apiKey) return;
    setBedrockSaving(true);
    const res = await fetch("/api/auth/bedrock-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBedrockSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save Bedrock API key");
      return;
    }
    const data = await res.json();
    setHasBedrockCredentials(true);
    setBedrockAccessKeyLastFour(data.accessKeyLastFour ?? payload.apiKey.slice(-4));
    if (payload.model) {
      setBedrockOrgModel(payload.model);
      setBedrockModelDraft(payload.model);
    }
    setBedrockDialogOpen(false);
    toast.success("Bedrock API key saved");
    const statusRes = await fetch("/api/ai-providers/status");
    if (statusRes.ok) setAiStatus(await statusRes.json());
  }

  async function saveBedrockOrgModel() {
    const model = bedrockModelDraft.trim();
    if (!model) {
      toast.error("Choose a Bedrock model");
      return;
    }
    setBedrockModelSaving(true);
    const res = await fetch("/api/auth/bedrock-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    setBedrockModelSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save Bedrock model");
      return;
    }
    setBedrockOrgModel(model);
    toast.success("Bedrock model updated");
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
    setBedrockOrgModel("");
    setBedrockModelDraft("");
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
                  <p className="text-2xl font-bold tabular-nums">{usage.articlesThisMonth}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {usage.usesByok
                      ? "BYOK — unlimited"
                      : usage.quota != null
                        ? `${usage.quotaRemaining ?? 0} remaining on platform key`
                        : "Generated this month"}
                  </p>
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
                      <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                      <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
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
            <h2 className="font-semibold">OpenAI (ChatGPT) BYOK</h2>
            <p className="text-sm text-muted-foreground">
              Bring your own OpenAI API key to route AI generation through your ChatGPT API account.
              {!canManageAiSettings && " Only site admins can manage the API key."}
            </p>
            {hasOpenAIKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Organization OpenAI API key connected</p>
                    <p className="text-xs text-muted-foreground">Ending in ••••{openaiLastFour ?? "••••"}</p>
                  </div>
                </div>
                {canManageAiSettings && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setOpenaiKeyInput(""); setOpenaiTestResult(null); setOpenaiDialogOpen(true); }}>
                      Replace key
                    </Button>
                    <Button variant="outline" size="sm" onClick={removeOpenAIKey} disabled={deletingOpenAIKey}>
                      {deletingOpenAIKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                    </Button>
                  </div>
                )}
              </div>
            ) : canManageAiSettings ? (
              <Button variant="outline" size="sm" onClick={() => { setOpenaiKeyInput(""); setOpenaiTestResult(null); setOpenaiDialogOpen(true); }}>
                <KeyRound className="mr-2 h-3.5 w-3.5" />Add OpenAI API key
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No organization OpenAI API key configured.</p>
            )}
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold">Anthropic (Claude) BYOK</h2>
            <p className="text-sm text-muted-foreground">
              Bring your own Anthropic API key to route AI generation through Claude directly (not via AWS Bedrock).
              {!canManageAiSettings && " Only site admins can manage the API key."}
            </p>
            {hasAnthropicKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Organization Anthropic API key connected</p>
                    <p className="text-xs text-muted-foreground">Ending in ••••{anthropicLastFour ?? "••••"}</p>
                  </div>
                </div>
                {canManageAiSettings && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setAnthropicKeyInput(""); setAnthropicTestResult(null); setAnthropicDialogOpen(true); }}>
                      Replace key
                    </Button>
                    <Button variant="outline" size="sm" onClick={removeAnthropicKey} disabled={deletingAnthropicKey}>
                      {deletingAnthropicKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                    </Button>
                  </div>
                )}
              </div>
            ) : canManageAiSettings ? (
              <Button variant="outline" size="sm" onClick={() => { setAnthropicKeyInput(""); setAnthropicTestResult(null); setAnthropicDialogOpen(true); }}>
                <KeyRound className="mr-2 h-3.5 w-3.5" />Add Anthropic API key
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No organization Anthropic API key configured.</p>
            )}
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Cloud className="w-4 h-4 text-amber-500" />
              AWS Bedrock (BYOK)
            </h2>
            <p className="text-sm text-muted-foreground">
              Bring your own Bedrock API key to run Claude and other Bedrock models through your AWS account.
              {!canManageAiSettings && " Only site admins can manage Bedrock credentials."}
            </p>
            {hasBedrockCredentials ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Organization Bedrock API key connected</p>
                    <p className="text-xs text-muted-foreground">
                      Key ending in ••••{bedrockAccessKeyLastFour ?? "••••"}
                      {bedrockOrgModel ? ` · model: ${bedrockOrgModel}` : ""}
                    </p>
                  </div>
                </div>
                {canManageAiSettings && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bedrock-org-model">Organization model</Label>
                      <div className="flex flex-wrap items-start gap-2">
                        <div className="min-w-0 max-w-md flex-1 space-y-1.5">
                          <Select
                            value={
                              !bedrockModelDraft
                                ? undefined
                                : bedrockOrgKnownIds.has(bedrockModelDraft)
                                  ? bedrockModelDraft
                                  : BEDROCK_MODEL_CUSTOM
                            }
                            onValueChange={(value) => {
                              if (value === BEDROCK_MODEL_CUSTOM) {
                                setBedrockModelDraft(
                                  bedrockOrgKnownIds.has(bedrockModelDraft)
                                    ? ""
                                    : bedrockModelDraft,
                                );
                                return;
                              }
                              setBedrockModelDraft(value);
                            }}
                            disabled={bedrockOrgModelsLoading || bedrockModelSaving}
                          >
                            <SelectTrigger id="bedrock-org-model">
                              <SelectValue
                                placeholder={
                                  bedrockOrgModelsLoading ? "Loading models…" : "Choose a Bedrock model"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {bedrockOrgModels.map((choice) => (
                                <SelectItem key={choice.id} value={choice.id}>
                                  {choice.label}
                                </SelectItem>
                              ))}
                              <SelectItem value={BEDROCK_MODEL_CUSTOM}>Custom model id…</SelectItem>
                            </SelectContent>
                          </Select>
                          {!bedrockModelDraft || !bedrockOrgKnownIds.has(bedrockModelDraft) ? (
                            <Input
                              id="bedrock-org-model-custom"
                              value={bedrockModelDraft}
                              onChange={(e) => setBedrockModelDraft(e.target.value)}
                              placeholder="e.g. amazon.nova-lite-v1:0"
                              className="font-mono text-sm"
                              autoComplete="off"
                            />
                          ) : null}
                          {bedrockOrgModelsError ? (
                            <p className="text-xs text-muted-foreground">{bedrockOrgModelsError}</p>
                          ) : null}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void saveBedrockOrgModel()}
                          disabled={
                            bedrockModelSaving ||
                            !bedrockModelDraft.trim() ||
                            bedrockModelDraft.trim() === bedrockOrgModel
                          }
                        >
                          {bedrockModelSaving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Save model"
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Models come from this AWS account. Change without re-entering the API key.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={openBedrockDialog}>
                        Replace key
                      </Button>
                      <Button variant="outline" size="sm" onClick={removeBedrockCredentials} disabled={deletingBedrock}>
                        {deletingBedrock ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : canManageAiSettings ? (
              <Button variant="outline" size="sm" onClick={openBedrockDialog}>
                <KeyRound className="mr-2 h-3.5 w-3.5" />Add Bedrock API key
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No organization Bedrock API key configured.</p>
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

          <DeeplByokPanel scope="org" canManage={canManageAiSettings} />

          <PublicApiKeysPanel canManage={canManageAiSettings} />

          <div className="paper-card p-6">
            <StockByokPanel
              scope="org"
              canManage={canManageAiSettings}
              billingFilter="free"
              title="Optional Unsplash / Pexels overrides"
              description="By default, free stock photos use platform-wide keys. Add your own Unsplash or Pexels developer keys here for higher rate limits or compliance."
            />
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
          <MfaSettingsPanel />
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

      <SettingsApiKeyDialogs
        geminiDialogOpen={geminiDialogOpen}
        setGeminiDialogOpen={setGeminiDialogOpen}
        geminiKeyInput={geminiKeyInput}
        setGeminiKeyInput={setGeminiKeyInput}
        geminiTestResult={geminiTestResult}
        geminiTesting={geminiTesting}
        geminiSaving={geminiSaving}
        testGeminiKey={testGeminiKey}
        saveGeminiKey={saveGeminiKey}
        openaiDialogOpen={openaiDialogOpen}
        setOpenaiDialogOpen={setOpenaiDialogOpen}
        openaiKeyInput={openaiKeyInput}
        setOpenaiKeyInput={setOpenaiKeyInput}
        openaiTestResult={openaiTestResult}
        openaiTesting={openaiTesting}
        openaiSaving={openaiSaving}
        testOpenAIKey={testOpenAIKey}
        saveOpenAIKey={saveOpenAIKey}
        anthropicDialogOpen={anthropicDialogOpen}
        setAnthropicDialogOpen={setAnthropicDialogOpen}
        anthropicKeyInput={anthropicKeyInput}
        setAnthropicKeyInput={setAnthropicKeyInput}
        anthropicTestResult={anthropicTestResult}
        anthropicTesting={anthropicTesting}
        anthropicSaving={anthropicSaving}
        testAnthropicKey={testAnthropicKey}
        saveAnthropicKey={saveAnthropicKey}
        bedrockDialogOpen={bedrockDialogOpen}
        setBedrockDialogOpen={setBedrockDialogOpen}
        bedrockForm={bedrockForm}
        setBedrockForm={setBedrockForm}
        bedrockTestResult={bedrockTestResult}
        bedrockTesting={bedrockTesting}
        bedrockSaving={bedrockSaving}
        testBedrockCredentials={testBedrockCredentials}
        saveBedrockCredentials={saveBedrockCredentials}
        semrushDialogOpen={semrushDialogOpen}
        setSemrushDialogOpen={setSemrushDialogOpen}
        semrushApiKeyInput={semrushApiKeyInput}
        setSemrushApiKeyInput={setSemrushApiKeyInput}
        semrushFormDatabase={semrushFormDatabase}
        setSemrushFormDatabase={setSemrushFormDatabase}
        semrushTestResult={semrushTestResult}
        semrushTesting={semrushTesting}
        semrushSaving={semrushSaving}
        testSemrushCredentials={testSemrushCredentials}
        saveSemrushCredentials={saveSemrushCredentials}
        showSemrushDatabaseHint={showSemrushDatabaseHint}
        suggestedSemrushDatabase={suggestedSemrushDatabase}
        activeProject={activeProject}
        contentLanguageLabel={contentLanguageLabel}
        semrushDatabaseLabel={semrushDatabaseLabel}
      />
    </div>
  );
}
