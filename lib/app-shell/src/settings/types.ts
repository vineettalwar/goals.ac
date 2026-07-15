export type SettingsTab = "profile" | "ai" | "security" | "billing" | "account";

export type UsageSummary = {
  plan: "starter" | "growth" | "scale";
  articlesThisMonth: number;
  quota: number | null;
  quotaRemaining: number | null;
  usesByok: boolean;
  byokSpendThisMonthUsd: number;
};

export type AiProviderChoice = "gemini" | "openai" | "anthropic" | "bedrock" | "ollama";

export type SettingsAiSummary = {
  activeProvider: string;
  hasGeminiKey: boolean;
  geminiLastFour: string | null;
  hasOpenaiKey: boolean;
  openaiLastFour: string | null;
  hasAnthropicKey: boolean;
  anthropicLastFour: string | null;
  hasBedrockCredentials: boolean;
  bedrockAccessKeyLastFour: string | null;
  bedrockRegion: string | null;
  bedrockModel: string | null;
  bedrockHasSessionToken: boolean;
  source?: "app" | "env" | "auto";
  settings: {
    provider: string | null;
    ollamaBaseUrl: string | null;
    ollamaModel: string | null;
  };
  ollama?: {
    baseUrl?: string;
    model?: string;
  };
};

export type SettingsBillingSummary = {
  plan: UsageSummary["plan"];
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  hasActiveSubscription: boolean;
  stripeConfigured: boolean;
  canManageBilling: boolean;
};

export const PLAN_LABELS: Record<UsageSummary["plan"], string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};
