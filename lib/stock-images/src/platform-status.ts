import type { StockProvider } from "./types";

export type PlatformStockImageStatus = {
  /** At least one free platform API key is configured in env. */
  configured: boolean;
  unsplash: boolean;
  pexels: boolean;
  providers: StockProvider[];
};

function envKey(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim() !== "");
}

/** True when UNSPLASH_ACCESS_KEY and/or PEXELS_API_KEY is set (platform-wide free APIs). */
export function isPlatformStockConfigured(): boolean {
  return envKey("UNSPLASH_ACCESS_KEY") || envKey("PEXELS_API_KEY");
}

export function getPlatformStockImageStatus(): PlatformStockImageStatus {
  const unsplash = envKey("UNSPLASH_ACCESS_KEY");
  const pexels = envKey("PEXELS_API_KEY");
  const providers: StockProvider[] = [];
  if (unsplash) providers.push("unsplash");
  if (pexels) providers.push("pexels");
  return {
    configured: unsplash || pexels,
    unsplash,
    pexels,
    providers,
  };
}
