export interface UsageSummary {
  plan: "starter" | "growth" | "scale";
  articlesThisMonth: number;
  quota: number | null;
  quotaRemaining: number | null;
  usesByok: boolean;
  byokSpendThisMonthUsd: number;
}

export interface AiProviderStatus {
  activeProvider: string;
  source: "app" | "env" | "auto";
  settings: {
    provider: string | null;
    ollamaBaseUrl: string | null;
    ollamaModel: string | null;
    openrouterModel?: string | null;
    nvidiaModel?: string | null;
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
  openai: { configured: boolean; source: string | null };
  openrouter?: { configured: boolean; source: string | null; model?: string | null };
  groq?: { configured: boolean; source: string | null };
  nvidia?: { configured: boolean; source: string | null; model?: string | null };
  ollama: { configured: boolean; baseUrl: string; model: string; reachable: boolean };
}
