import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { SettingsAiSummary, SettingsBillingSummary, SettingsIntegrationsSummary, UsageSummary } from "@workspace/app-shell";

type MeResponse = {
  user?: {
    id: number;
    email: string;
    name: string | null;
    role: string;
    avatarUrl: string | null;
  };
  hasGeminiKey?: boolean;
  hasGoogleId?: boolean;
  hasPassword?: boolean;
  orgRole?: string | null;
};

type ApiKeyResponse = {
  hasKey?: boolean;
  lastFour?: string | null;
};

type BedrockCredentialsResponse = {
  hasCredentials?: boolean;
  accessKeyLastFour?: string | null;
  region?: string | null;
  model?: string | null;
  hasSessionToken?: boolean;
};

type StockCredentialsResponse = {
  platform?: SettingsIntegrationsSummary["stock"]["platform"];
  org?: SettingsIntegrationsSummary["stock"]["org"];
  providers?: SettingsIntegrationsSummary["stock"]["providers"];
};

type SemrushCredentialsResponse = {
  hasCredentials?: boolean;
  apiKeyLastFour?: string | null;
  database?: string;
};

type DeeplCredentialsResponse = {
  configured?: boolean;
  apiKeyLastFour?: string | null;
  docsUrl?: string;
};

type AiStatusResponse = {
  activeProvider?: string;
  source?: "app" | "env" | "auto";
  settings?: {
    provider?: string | null;
    ollamaBaseUrl?: string | null;
    ollamaModel?: string | null;
  };
  ollama?: {
    baseUrl?: string;
    model?: string;
  };
};

export function useSettingsData() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [hasGoogleId, setHasGoogleId] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<SettingsAiSummary | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [billingSummary, setBillingSummary] = useState<SettingsBillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [integrationsSummary, setIntegrationsSummary] = useState<SettingsIntegrationsSummary | null>(null);

  const loadBillingSummary = useCallback(async () => {
    setBillingLoading(true);
    try {
      const data = await apiFetch<{ billing?: SettingsBillingSummary }>("/api/billing/status");
      setBillingSummary(data.billing ?? null);
    } catch {
      setBillingSummary(null);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setUsageLoading(true);
    try {
      const [
        me,
        usageData,
        keyData,
        openaiData,
        anthropicData,
        bedrockData,
        aiData,
        semrushData,
        deeplData,
        stockData,
      ] = await Promise.all([
        apiFetch<MeResponse>("/api/auth/me"),
        apiFetch<{ usage?: UsageSummary }>("/api/usage").catch(() => null),
        apiFetch<ApiKeyResponse>("/api/auth/api-key").catch(() => null),
        apiFetch<ApiKeyResponse>("/api/auth/openai-credentials").catch(() => null),
        apiFetch<ApiKeyResponse>("/api/auth/anthropic-credentials").catch(() => null),
        apiFetch<BedrockCredentialsResponse>("/api/auth/bedrock-credentials").catch(() => null),
        apiFetch<AiStatusResponse>("/api/ai-providers/status").catch(() => null),
        apiFetch<SemrushCredentialsResponse>("/api/auth/semrush-credentials").catch(() => null),
        apiFetch<DeeplCredentialsResponse>("/api/auth/deepl-credentials").catch(() => null),
        apiFetch<StockCredentialsResponse>("/api/auth/stock-credentials").catch(() => null),
      ]);

      if (me.user) {
        setEmail(me.user.email);
        setUserRole(me.user.role ?? null);
      }
      setOrgRole(me.orgRole ?? null);
      setHasGoogleId(me.hasGoogleId ?? false);
      setHasPassword(me.hasPassword ?? false);

      setUsage(usageData?.usage ?? null);
      setUsageLoading(false);

      const hasGeminiKey = Boolean(me.hasGeminiKey || keyData?.hasKey);
      setAiSummary({
        activeProvider: aiData?.activeProvider ?? "gemini",
        hasGeminiKey,
        geminiLastFour: keyData?.lastFour ?? null,
        hasOpenaiKey: Boolean(openaiData?.hasKey),
        openaiLastFour: openaiData?.lastFour ?? null,
        hasAnthropicKey: Boolean(anthropicData?.hasKey),
        anthropicLastFour: anthropicData?.lastFour ?? null,
        hasBedrockCredentials: Boolean(bedrockData?.hasCredentials),
        bedrockAccessKeyLastFour: bedrockData?.accessKeyLastFour ?? null,
        bedrockRegion: bedrockData?.region ?? null,
        bedrockModel: bedrockData?.model ?? null,
        bedrockHasSessionToken: Boolean(bedrockData?.hasSessionToken),
        source: aiData?.source,
        settings: {
          provider: aiData?.settings?.provider ?? null,
          ollamaBaseUrl: aiData?.settings?.ollamaBaseUrl ?? null,
          ollamaModel: aiData?.settings?.ollamaModel ?? null,
        },
        ollama: aiData?.ollama,
      });
      setIntegrationsSummary({
        semrush: {
          hasCredentials: Boolean(semrushData?.hasCredentials),
          apiKeyLastFour: semrushData?.apiKeyLastFour ?? null,
          database: semrushData?.database ?? "us",
        },
        deepl: {
          configured: Boolean(deeplData?.configured),
          apiKeyLastFour: deeplData?.apiKeyLastFour ?? null,
          docsUrl: deeplData?.docsUrl,
        },
        stock: {
          platform: stockData?.platform,
          org: stockData?.org ?? [],
          providers: stockData?.providers ?? [],
        },
      });
    } finally {
      setLoading(false);
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    email,
    hasGoogleId,
    hasPassword,
    usage,
    usageLoading,
    aiSummary,
    integrationsSummary,
    userRole,
    orgRole,
    reload,
    forgotPasswordHref: "/forgot-password",
    billingSummary,
    billingLoading,
    loadBillingSummary,
  };
}
