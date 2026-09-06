import type { CmsIntegrationCredentials } from "./cms-integration-types";
import { resolveWordPressConnectionType, type SocialPlatform } from "./cms-platform-keys";

function secretHint(value: string): string {
  return value.length > 8 ? `...${value.slice(-4)}` : "****";
}

const LAST_HEALTH_KEYS = [
  "lastHealthOk",
  "lastHealthError",
  "lastHealthCheckedAt",
  "lastHealthThemeSnippetRequiredFor",
  "lastHealthSeoPlugin",
] as const;

/** Copy persisted health meta from the raw stored blob onto a masked row. */
function attachLastHealth(
  maskedRow: Record<string, unknown>,
  storedRow: unknown,
): void {
  if (!storedRow || typeof storedRow !== "object") return;
  const raw = storedRow as Record<string, unknown>;
  for (const key of LAST_HEALTH_KEYS) {
    if (key in raw) maskedRow[key] = raw[key];
  }
}

/**
 * Public-safe integration snapshot. Pass `stored` so lastHealth* from the
 * health cron/API reaches integration tiles.
 */
export function maskCmsCredentials(
  decrypted: CmsIntegrationCredentials,
  stored?: Record<string, unknown> | null,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (decrypted.notion) {
    result.notion = {
      connected: true,
      databaseId: decrypted.notion.databaseId,
      integrationTokenHint: secretHint(decrypted.notion.integrationToken),
    };
  }
  if (decrypted.webflow) {
    result.webflow = {
      connected: true,
      collectionId: decrypted.webflow.collectionId,
      bodyFieldSlug: decrypted.webflow.bodyFieldSlug,
      publishStatus: decrypted.webflow.publishStatus ?? "draft",
      apiTokenHint: secretHint(decrypted.webflow.apiToken),
    };
  }
  if (decrypted.wordpress) {
    const connectionType = resolveWordPressConnectionType(decrypted.wordpress);
    result.wordpress = {
      connected: true,
      connectionType,
      siteUrl: decrypted.wordpress.siteUrl,
      outputMode: decrypted.wordpress.outputMode ?? decrypted.wordpress.editorMode,
      editorMode: decrypted.wordpress.editorMode ?? decrypted.wordpress.outputMode,
      seoPlugin: decrypted.wordpress.seoPlugin,
      usernameHint: decrypted.wordpress.username
        ? secretHint(decrypted.wordpress.username)
        : undefined,
      siteKeyHint: decrypted.wordpress.siteKey
        ? secretHint(decrypted.wordpress.siteKey)
        : undefined,
    };
  }
  if (decrypted.ghost) {
    result.ghost = {
      connected: true,
      apiUrl: decrypted.ghost.apiUrl,
      outputMode: decrypted.ghost.outputMode ?? "html",
      adminApiKeyHint: secretHint(decrypted.ghost.adminApiKey),
    };
  }
  if (decrypted.webhook) {
    result.webhook = {
      connected: true,
      url: decrypted.webhook.url,
      outputMode: decrypted.webhook.outputMode ?? "both",
      signingSecretHint: secretHint(decrypted.webhook.signingSecret),
    };
  }
  if (decrypted.shopify) {
    result.shopify = {
      connected: true,
      connectionType: decrypted.shopify.connectionType,
      shopDomain: decrypted.shopify.shopDomain,
      siteUrl: decrypted.shopify.siteUrl,
      blogId: decrypted.shopify.blogId,
      outputMode: decrypted.shopify.outputMode ?? "article_html",
      accessTokenHint: decrypted.shopify.accessToken
        ? secretHint(decrypted.shopify.accessToken)
        : undefined,
      siteKeyHint: decrypted.shopify.siteKey
        ? secretHint(decrypted.shopify.siteKey)
        : undefined,
    };
  }
  if (decrypted.drupal) {
    result.drupal = {
      connected: true,
      connectionType: decrypted.drupal.connectionType,
      siteUrl: decrypted.drupal.siteUrl,
      authType: decrypted.drupal.authType,
      contentType: decrypted.drupal.contentType,
      outputMode: decrypted.drupal.outputMode ?? "body_html",
      layoutStorageField: decrypted.drupal.layoutStorageField,
      usernameHint: decrypted.drupal.username
        ? secretHint(decrypted.drupal.username)
        : undefined,
      siteKeyHint: decrypted.drupal.siteKey
        ? secretHint(decrypted.drupal.siteKey)
        : undefined,
    };
  }
  if (decrypted.joomla) {
    result.joomla = {
      connected: true,
      connectionType: decrypted.joomla.connectionType,
      siteUrl: decrypted.joomla.siteUrl,
      categoryId: decrypted.joomla.categoryId,
      outputMode: decrypted.joomla.outputMode ?? "markdown",
      apiTokenHint: decrypted.joomla.apiToken
        ? secretHint(decrypted.joomla.apiToken)
        : undefined,
      siteKeyHint: decrypted.joomla.siteKey
        ? secretHint(decrypted.joomla.siteKey)
        : undefined,
    };
  }
  if (decrypted.linkedin) {
    result.linkedin = {
      connected: true,
      displayName: decrypted.linkedin.displayName,
      authorUrn: decrypted.linkedin.authorUrn,
      expiresAt: decrypted.linkedin.expiresAt,
    };
  }
  if (decrypted.twitter) {
    result.twitter = {
      connected: true,
      screenName: decrypted.twitter.screenName,
      userId: decrypted.twitter.userId,
      expiresAt: decrypted.twitter.expiresAt,
    };
  }
  if (decrypted.meta) {
    result.meta = {
      connected: true,
      pageId: decrypted.meta.pageId,
      pageName: decrypted.meta.pageName,
      instagramAccountId: decrypted.meta.instagramAccountId,
      instagramUsername: decrypted.meta.instagramUsername,
      expiresAt: decrypted.meta.expiresAt,
    };
  }
  if (decrypted.bluesky) {
    result.bluesky = {
      connected: true,
      handle: decrypted.bluesky.handle,
      did: decrypted.bluesky.did,
      expiresAt: decrypted.bluesky.expiresAt,
    };
  }
  if (decrypted.mastodon) {
    result.mastodon = {
      connected: true,
      instanceUrl: decrypted.mastodon.instanceUrl,
      username: decrypted.mastodon.username,
    };
  }
  if (decrypted.wix) {
    result.wix = {
      connected: true,
      siteId: decrypted.wix.siteId,
      publishStatus: decrypted.wix.publishStatus ?? "draft",
      accessTokenHint: secretHint(decrypted.wix.accessToken),
    };
  }
  if (decrypted.framer) {
    result.framer = {
      connected: true,
      collectionId: decrypted.framer.collectionId,
      titleFieldSlug: decrypted.framer.titleFieldSlug,
      bodyFieldSlug: decrypted.framer.bodyFieldSlug,
      publishStatus: decrypted.framer.publishStatus ?? "draft",
      apiTokenHint: secretHint(decrypted.framer.apiToken),
    };
  }
  if (decrypted.squarespace) {
    result.squarespace = {
      connected: true,
      siteId: decrypted.squarespace.siteId,
      publishStatus: decrypted.squarespace.publishStatus ?? "draft",
      apiKeyHint: secretHint(decrypted.squarespace.apiKey),
    };
  }
  if (decrypted.contentful) {
    result.contentful = {
      connected: true,
      spaceId: decrypted.contentful.spaceId,
      environmentId: decrypted.contentful.environmentId,
      contentTypeId: decrypted.contentful.contentTypeId,
      fieldMapping: decrypted.contentful.fieldMapping,
      accessTokenHint: secretHint(decrypted.contentful.accessToken),
    };
  }
  if (decrypted.sanity) {
    result.sanity = {
      connected: true,
      projectId: decrypted.sanity.projectId,
      dataset: decrypted.sanity.dataset,
      documentType: decrypted.sanity.documentType,
      fieldMapping: decrypted.sanity.fieldMapping,
      tokenHint: secretHint(decrypted.sanity.token),
    };
  }
  if (decrypted.strapi) {
    result.strapi = {
      connected: true,
      baseUrl: decrypted.strapi.baseUrl,
      contentType: decrypted.strapi.contentType,
      publishStatus: decrypted.strapi.publishStatus ?? "draft",
      apiTokenHint: secretHint(decrypted.strapi.apiToken),
    };
  }
  if (decrypted.beehiiv) {
    result.beehiiv = {
      connected: true,
      publicationId: decrypted.beehiiv.publicationId,
      apiKeyHint: secretHint(decrypted.beehiiv.apiKey),
    };
  }
  if (decrypted.convertkit) {
    result.convertkit = {
      connected: true,
      formId: decrypted.convertkit.formId,
      apiSecretHint: secretHint(decrypted.convertkit.apiSecret),
    };
  }
  if (decrypted.mailchimp) {
    result.mailchimp = {
      connected: true,
      serverPrefix: decrypted.mailchimp.serverPrefix,
      listId: decrypted.mailchimp.listId,
      apiKeyHint: secretHint(decrypted.mailchimp.apiKey),
    };
  }
  if (decrypted.hubspot) {
    result.hubspot = {
      connected: true,
      blogId: decrypted.hubspot.blogId,
      publishStatus: decrypted.hubspot.publishStatus ?? "draft",
      accessTokenHint: secretHint(decrypted.hubspot.accessToken),
    };
  }
  if (decrypted.typo3) {
    result.typo3 = {
      connected: true,
      connectionType: decrypted.typo3.connectionType,
      siteUrl: decrypted.typo3.siteUrl,
      outputMode: decrypted.typo3.outputMode ?? "body_text",
      siteKeyHint: secretHint(decrypted.typo3.siteKey),
    };
  }
  if (stored) {
    for (const [platform, maskedRow] of Object.entries(result)) {
      if (!maskedRow || typeof maskedRow !== "object") continue;
      attachLastHealth(maskedRow as Record<string, unknown>, stored[platform]);
    }
  }
  return result;
}

export function getConnectedSocialPlatforms(creds: CmsIntegrationCredentials): SocialPlatform[] {
  const platforms: SocialPlatform[] = [];
  if (creds.linkedin) platforms.push("linkedin");
  if (creds.twitter) platforms.push("twitter");
  if (creds.meta?.instagramAccountId) platforms.push("instagram");
  if (creds.meta?.pageId) platforms.push("facebook");
  if (creds.bluesky) platforms.push("bluesky");
  if (creds.mastodon) platforms.push("mastodon");
  return platforms;
}
