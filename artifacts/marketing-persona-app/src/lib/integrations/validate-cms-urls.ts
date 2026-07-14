import { assertPublicUrl } from "@workspace/security/ssrf-guard";

type CmsIntegrationsInput = {
  wordpress?: { siteUrl?: string };
  ghost?: { apiUrl?: string };
  webhook?: { url?: string };
  shopify?: { siteUrl?: string; shopDomain?: string; connectionType?: string };
  drupal?: { siteUrl?: string };
  joomla?: { siteUrl?: string };
  strapi?: { baseUrl?: string };
  typo3?: { siteUrl?: string };
};

async function assertSafeUrl(url: string, label: string): Promise<void> {
  try {
    await assertPublicUrl(url);
  } catch {
    throw new Error(`${label} must be a public http(s) URL`);
  }
}

export async function assertCmsIntegrationUrlsSafe(data: CmsIntegrationsInput): Promise<void> {
  const checks: Array<Promise<void>> = [];

  if (data.wordpress?.siteUrl) {
    checks.push(assertSafeUrl(data.wordpress.siteUrl, "WordPress site URL"));
  }
  if (data.ghost?.apiUrl) {
    checks.push(assertSafeUrl(data.ghost.apiUrl, "Ghost API URL"));
  }
  if (data.webhook?.url) {
    checks.push(assertSafeUrl(data.webhook.url, "Webhook URL"));
  }
  if (data.shopify) {
    if ("siteUrl" in data.shopify && data.shopify.siteUrl) {
      checks.push(assertSafeUrl(data.shopify.siteUrl, "Shopify site URL"));
    } else if ("shopDomain" in data.shopify && data.shopify.shopDomain) {
      const domain = data.shopify.shopDomain.includes("://")
        ? data.shopify.shopDomain
        : `https://${data.shopify.shopDomain}`;
      checks.push(assertSafeUrl(domain, "Shopify shop domain"));
    }
  }
  if (data.drupal?.siteUrl) {
    checks.push(assertSafeUrl(data.drupal.siteUrl, "Drupal site URL"));
  }
  if (data.joomla?.siteUrl) {
    checks.push(assertSafeUrl(data.joomla.siteUrl, "Joomla site URL"));
  }
  if (data.strapi?.baseUrl) {
    checks.push(assertSafeUrl(data.strapi.baseUrl, "Strapi base URL"));
  }
  if (data.typo3?.siteUrl) {
    checks.push(assertSafeUrl(data.typo3.siteUrl, "TYPO3 site URL"));
  }

  await Promise.all(checks);
}
