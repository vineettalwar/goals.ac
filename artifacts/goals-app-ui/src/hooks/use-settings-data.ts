import { useCallback, useEffect, useState } from "react";
import { apiFetch, getAppOrigin } from "@/lib/api";
import type { SettingsAiSummary, UsageSummary } from "@workspace/app-shell";

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

  const reload = useCallback(async () => {
    setLoading(true);
    setUsageLoading(true);
    try {
      const [me, usageData, keyData, openaiData, anthropicData, bedrockData, aiData] = await Promise.all([
        apiFetch<MeResponse>("/api/auth/me"),
        apiFetch<{ usage?: UsageSummary }>("/api/usage").catch(() => null),
        apiFetch<ApiKeyResponse>("/api/auth/api-key").catch(() => null),
        apiFetch<ApiKeyResponse>("/api/auth/openai-credentials").catch(() => null),
        apiFetch<ApiKeyResponse>("/api/auth/anthropic-credentials").catch(() => null),
        apiFetch<BedrockCredentialsResponse>("/api/auth/bedrock-credentials").catch(() => null),
        apiFetch<AiStatusResponse>("/api/ai-providers/status").catch(() => null),
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
    userRole,
    orgRole,
    reload,
    forgotPasswordHref: `${getAppOrigin()}/forgot-password`,
  };
}
