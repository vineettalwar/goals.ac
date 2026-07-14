import type { FreeStockProvider } from "./providers";
import { isStockProviderId, STOCK_PROVIDER_REGISTRY } from "./providers";
import { searchPexels } from "./pexels";
import { searchUnsplash } from "./unsplash";

export async function testStockProviderConnection(
  provider: FreeStockProvider,
  apiKey: string,
): Promise<{ ok: true; note?: string } | { ok: false; error: string }> {
  const trimmed = apiKey.trim();
  if (trimmed.length < 8) {
    return { ok: false, error: "API key is too short" };
  }
  if (!isStockProviderId(provider) || STOCK_PROVIDER_REGISTRY[provider].billing !== "free") {
    return { ok: false, error: "Unknown stock provider" };
  }

  const meta = STOCK_PROVIDER_REGISTRY[provider];

  try {
    if (provider === "unsplash") {
      const photos = await searchUnsplash("office", { perPage: 1, accessKey: trimmed });
      if (photos.length === 0) return { ok: false, error: "Unsplash returned no results for test query" };
      return { ok: true };
    }
    if (provider === "pexels") {
      const photos = await searchPexels("office", { perPage: 1, apiKey: trimmed });
      if (photos.length === 0) return { ok: false, error: "Pexels returned no results for test query" };
      return { ok: true };
    }
    return { ok: false, error: `Unsupported provider: ${provider}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!meta.searchImplemented) {
      return { ok: false, error: message };
    }
    return { ok: false, error: message };
  }
}
