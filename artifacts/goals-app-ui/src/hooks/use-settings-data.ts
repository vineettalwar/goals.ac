import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";
import type {
  SettingsAiSummary,
  SettingsBillingSummary,
  SettingsIntegrationsSummary,
  UsageSummary,
} from "@workspace/app-shell";

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

type SettingsData = {
  email: string;
  hasGoogleId: boolean;
  hasPassword: boolean;
  usage: UsageSummary | null;
  aiSummary: SettingsAiSummary | null;
  userRole: string | null;
  orgRole: string | null;
  integrationsSummary: SettingsIntegrationsSummary | null;
};

async function fetchSettingsData(): Promise<SettingsData> {
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

  const hasGeminiKey = Boolean(me.hasGeminiKey || keyData?.hasKey);

  return {
    email: me.user?.email ?? "",
    hasGoogleId: me.hasGoogleId ?? false,
    hasPassword: me.hasPassword ?? false,
    usage: usageData?.usage ?? null,
    userRole: me.user?.role ?? null,
    orgRole: me.orgRole ?? null,
    aiSummary: {
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
    },
    integrationsSummary: {
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
    },
  };
}

export function useSettingsData() {
  const queryClient = useQueryClient();
  const [billingRequested, setBillingRequested] = useState(false);

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: fetchSettingsData,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const billingQuery = useQuery({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const data = await apiFetch<{ billing?: SettingsBillingSummary }>("/api/billing/status");
      return data.billing ?? null;
    },
    enabled: billingRequested,
    staleTime: 30_000,
  });

  const loadBillingSummary = useCallback(async () => {
    setBillingRequested(true);
    await queryClient.invalidateQueries({ queryKey: ["billing-status"] });
  }, [queryClient]);

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.settings });
  }, [queryClient]);

  const data = settingsQuery.data;

  return {
    loading: settingsQuery.isPending && !data,
    email: data?.email ?? "",
    hasGoogleId: data?.hasGoogleId ?? false,
    hasPassword: data?.hasPassword ?? false,
    usage: data?.usage ?? null,
    usageLoading: settingsQuery.isPending && !data,
    aiSummary: data?.aiSummary ?? null,
    integrationsSummary: data?.integrationsSummary ?? null,
    userRole: data?.userRole ?? null,
    orgRole: data?.orgRole ?? null,
    reload,
    forgotPasswordHref: "/forgot-password",
    billingSummary: billingQuery.data ?? null,
    billingLoading: billingQuery.isFetching,
    loadBillingSummary,
  };
}
