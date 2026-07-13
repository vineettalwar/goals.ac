const STOCK_CDN_HOSTS = new Set([
  "images.unsplash.com",
  "plus.unsplash.com",
  "images.pexels.com",
]);

export function isAllowedStockCdnHost(hostname: string): boolean {
  return STOCK_CDN_HOSTS.has(hostname.toLowerCase());
}

export function assertAllowedStockCdnUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid stock image URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Stock image URLs must use HTTPS");
  }
  if (!isAllowedStockCdnHost(parsed.hostname)) {
    throw new Error(`Stock image host not allowed: ${parsed.hostname}`);
  }
}
