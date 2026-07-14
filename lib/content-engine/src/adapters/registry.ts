import { contentfulAdapter, sanityAdapter, strapiAdapter } from "./cms-fields-adapter";
import { ghostAdapter } from "./ghost-adapter";
import {
  framerAdapter,
  hubspotAdapter,
  squarespaceAdapter,
  wixAdapter,
} from "./html-publish-adapter";
import { notionAdapter } from "./notion-adapter";
import { drupalAdapter } from "./drupal-adapter";
import { joomlaAdapter } from "./joomla-adapter";
import { shopifyAdapter } from "./shopify-adapter";
import { typo3Adapter } from "./typo3-adapter";
import { webflowAdapter } from "./webflow-adapter";
import { webhookAdapter } from "./webhook-adapter";
import { wordpressAdapter } from "./wordpress-adapter";
import type { AdapterPlatformId, CmsAdapter } from "./types";

const ADAPTERS: Partial<Record<AdapterPlatformId, CmsAdapter>> = {
  wordpress: wordpressAdapter,
  notion: notionAdapter,
  webflow: webflowAdapter,
  ghost: ghostAdapter,
  webhook: webhookAdapter,
  contentful: contentfulAdapter,
  sanity: sanityAdapter,
  strapi: strapiAdapter,
  shopify: shopifyAdapter,
  drupal: drupalAdapter,
  joomla: joomlaAdapter,
  typo3: typo3Adapter,
  wix: wixAdapter,
  framer: framerAdapter,
  squarespace: squarespaceAdapter,
  hubspot: hubspotAdapter,
};

export function getAdapter(platform: string): CmsAdapter | null {
  return ADAPTERS[platform as AdapterPlatformId] ?? null;
}

export function getAdapterCapabilities(platform: string) {
  return getAdapter(platform)?.capabilities ?? null;
}

export function listAdaptedPlatforms(): AdapterPlatformId[] {
  return Object.keys(ADAPTERS) as AdapterPlatformId[];
}

export {
  wordpressAdapter,
  notionAdapter,
  webflowAdapter,
  ghostAdapter,
  webhookAdapter,
  contentfulAdapter,
  sanityAdapter,
  strapiAdapter,
  shopifyAdapter,
  drupalAdapter,
  joomlaAdapter,
  typo3Adapter,
  wixAdapter,
  framerAdapter,
  squarespaceAdapter,
  hubspotAdapter,
};
