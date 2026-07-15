export type SettingsTab = "profile" | "security" | "billing" | "account";

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

export type SettingsStockCredential = {
  provider: string;
  apiKeyLastFour: string;
  billing: "free" | "paid";
  searchImplemented: boolean;
};

export type SettingsStockProviderMeta = {
  id: string;
  label: string;
  billing: "free" | "paid";
  searchImplemented: boolean;
  byokAllowed: boolean;
  docsUrl: string;
};

export type SettingsIntegrationsSummary = {
  semrush: {
    hasCredentials: boolean;
    apiKeyLastFour: string | null;
    database: string;
  };
  deepl: {
    configured: boolean;
    apiKeyLastFour: string | null;
    docsUrl?: string;
  };
  stock: {
    platform?: { configured: boolean; unsplash: boolean; pexels: boolean };
    org: SettingsStockCredential[];
    providers: SettingsStockProviderMeta[];
  };
};

export const PLAN_LABELS: Record<UsageSummary["plan"], string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};
