import type { SearchPropertyProvider } from "@workspace/db/schema-sqlite";

export type SearchPropertyAuthEnv = {
  AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BING_WEBMASTER_CLIENT_ID?: string;
  BING_WEBMASTER_CLIENT_SECRET?: string;
};

export type SearchOAuthStatePayload = {
  projectId: number;
  userId: number;
  provider: SearchPropertyProvider | "google_analytics_4";
  returnUrl: string;
  exp: number;
  nonce: string;
};

export type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
};
