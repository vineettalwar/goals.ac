"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  SettingsAiSummary,
  SettingsBillingSummary,
  SettingsIntegrationsSummary,
  UsageSummary,
} from "@workspace/app-shell/settings";
import type { SettingsInitialData } from "@/lib/server/loaders";

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

type StockCredentialsResponse = {
  platform?: SettingsIntegrationsSummary["stock"]["platform"];
  org?: SettingsIntegrationsSummary["stock"]["org"];
  providers?: SettingsIntegrationsSummary["stock"]["providers"];
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

function aiSummaryFromInitial(data: SettingsInitialData): SettingsAiSummary {
  const ai = data.aiStatus;
  return {
    activeProvider: ai?.activeProvider ?? "gemini",
    hasGeminiKey: data.apiKey.hasKey,
    geminiLastFour: data.apiKey.lastFour,
    hasOpenaiKey: data.openaiCredentials.hasKey,
    openaiLastFour: data.openaiCredentials.lastFour,
    hasAnthropicKey: data.anthropicCredentials.hasKey,
    anthropicLastFour: data.anthropicCredentials.lastFour,
    hasBedrockCredentials: data.bedrockCredentials.hasCredentials,
    bedrockAccessKeyLastFour: data.bedrockCredentials.accessKeyLastFour,
    bedrockRegion: data.bedrockCredentials.region,
    bedrockModel: data.bedrockCredentials.model,
    bedrockHasSessionToken: false,
    source: ai?.source,
    settings: {
      provider: ai?.settings?.provider ?? null,
      ollamaBaseUrl: ai?.settings?.ollamaBaseUrl ?? null,
      ollamaModel: ai?.settings?.ollamaModel ?? null,
    },
    ollama: ai?.ollama,
  };
}

function integrationsFromInitial(data: SettingsInitialData): SettingsIntegrationsSummary {
  return {
    semrush: {
      hasCredentials: data.semrushCredentials.hasCredentials,
      apiKeyLastFour: data.semrushCredentials.apiKeyLastFour,
      database: data.semrushCredentials.database ?? "us",
    },
    deepl: {
      configured: false,
      apiKeyLastFour: null,
    },
    stock: {
      org: [],
      providers: [],
    },
  };
}

export function useSettingsData(initialData?: SettingsInitialData) {
  const [loading, setLoading] = useState(!initialData);
  const [email, setEmail] = useState("");
  const [hasGoogleId, setHasGoogleId] = useState(initialData?.me?.hasGoogleId ?? false);
  const [hasPassword, setHasPassword] = useState(initialData?.me?.hasPassword ?? false);
  const [usage, setUsage] = useState<UsageSummary | null>(initialData?.usage ?? null);
  const [usageLoading, setUsageLoading] = useState(!initialData);
  const [aiSummary, setAiSummary] = useState<SettingsAiSummary | null>(() =>
    initialData ? aiSummaryFromInitial(initialData) : null,
  );
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [billingSummary, setBillingSummary] = useState<SettingsBillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [integrationsSummary, setIntegrationsSummary] = useState<SettingsIntegrationsSummary | null>(
    () => (initialData ? integrationsFromInitial(initialData) : null),
  );

  const loadBillingSummary = useCallback(async () => {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/billing/status");
      if (!res.ok) {
        setBillingSummary(null);
        return;
      }
      const data = (await res.json()) as { billing?: SettingsBillingSummary };
      setBillingSummary(data.billing ?? null);
    } catch {
      setBillingSummary(null);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  const reload = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setUsageLoading(true);
    }
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
        fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)) as Promise<MeResponse | null>,
        fetch("/api/usage").then((r) => (r.ok ? r.json() : null)) as Promise<{ usage?: UsageSummary } | null>,
        fetch("/api/auth/api-key").then((r) => (r.ok ? r.json() : null)) as Promise<ApiKeyResponse | null>,
        fetch("/api/auth/openai-credentials").then((r) =>
          r.ok ? r.json() : null,
        ) as Promise<ApiKeyResponse | null>,
        fetch("/api/auth/anthropic-credentials").then((r) =>
          r.ok ? r.json() : null,
        ) as Promise<ApiKeyResponse | null>,
        fetch("/api/auth/bedrock-credentials").then((r) =>
          r.ok ? r.json() : null,
        ) as Promise<BedrockCredentialsResponse | null>,
        fetch("/api/ai-providers/status").then((r) =>
          r.ok ? r.json() : null,
        ) as Promise<AiStatusResponse | null>,
        fetch("/api/auth/semrush-credentials").then((r) =>
          r.ok ? r.json() : null,
        ) as Promise<SemrushCredentialsResponse | null>,
        fetch("/api/auth/deepl-credentials").then((r) =>
          r.ok ? r.json() : null,
        ) as Promise<DeeplCredentialsResponse | null>,
        fetch("/api/auth/stock-credentials").then((r) =>
          r.ok ? r.json() : null,
        ) as Promise<StockCredentialsResponse | null>,
      ]);

      if (me?.user) {
        setEmail(me.user.email);
        setUserRole(me.user.role ?? null);
      }
      setOrgRole(me?.orgRole ?? null);
      setHasGoogleId(me?.hasGoogleId ?? false);
      setHasPassword(me?.hasPassword ?? false);

      setUsage(usageData?.usage ?? null);
      setUsageLoading(false);

      const hasGeminiKey = Boolean(me?.hasGeminiKey || keyData?.hasKey);
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
      if (showLoading) {
        setLoading(false);
        setUsageLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void reload(!initialData);
  }, [initialData, reload]);

  return {
    loading,
    email,
    hasGoogleId,
    hasPassword,
    usage,
    usageLoading,
    aiSummary,
    userRole,
    orgRole,
    integrationsSummary,
    reload,
    forgotPasswordHref: "/forgot-password",
    billingSummary,
    billingLoading,
    loadBillingSummary,
    canManageAiSettings: initialData?.canManageAiSettings,
  };
}
