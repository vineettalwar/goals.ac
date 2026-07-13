export type KeywordDifficultyLevel = "low" | "medium" | "high";

export type KeywordMetrics = {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  difficulty: KeywordDifficultyLevel;
  cpc?: number;
  intents?: string[];
  serpFeatures?: string[];
};

export type DomainKeywordGap = {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  difficulty: KeywordDifficultyLevel;
  competitorPositions: number[];
  competition?: number;
  cpc?: number;
};

export type SemrushCredentials = {
  apiKey: string;
  database: string;
};

export interface KeywordResearchProvider {
  readonly id: string;
  getKeywordMetrics(params: {
    keywords: string[];
    database: string;
    apiKey: string;
  }): Promise<KeywordMetrics[]>;
  getDomainKeywordGaps(params: {
    domain: string;
    competitors: string[];
    database: string;
    apiKey: string;
    limit?: number;
  }): Promise<DomainKeywordGap[]>;
  testConnection(params: { apiKey: string; database: string }): Promise<void>;
}

export class KeywordResearchProviderNotConfiguredError extends Error {
  constructor(message = "Keyword research provider is not configured.") {
    super(message);
    this.name = "KeywordResearchProviderNotConfiguredError";
  }
}
