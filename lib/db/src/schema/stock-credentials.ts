/** Copyright-free stock photo APIs (Unsplash, Pexels). */
export type StockCredentialProviderId = "unsplash" | "pexels";

export type EncryptedStockCredentialsMap = Partial<Record<StockCredentialProviderId, string>>;
