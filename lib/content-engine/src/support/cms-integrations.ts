import { encryptSecret, decryptSecret } from "@workspace/security/encryption";

export type CmsConnectionType = "api" | "plugin";

export interface CmsIntegrationCredentials {
  notion?: {
    integrationToken: string;
    databaseId: string;
  };
  webflow?: {
    apiToken: string;
    collectionId: string;
    bodyFieldSlug: string;
  };
  wordpress?: {
    connectionType?: CmsConnectionType;
    siteUrl: string;
    username?: string;
    appPassword?: string;
    siteKey?: string;
  };
  ghost?: {
    apiUrl: string;
    adminApiKey: string;
  };
  webhook?: {
    url: string;
    signingSecret: string;
  };
  shopify?: {
    connectionType: CmsConnectionType;
    shopDomain?: string;
    accessToken?: string;
    blogId?: string;
    siteUrl?: string;
    siteKey?: string;
  };
  drupal?: {
    connectionType: CmsConnectionType;
    siteUrl: string;
    authType?: "basic" | "bearer";
    username?: string;
    password?: string;
    accessToken?: string;
    contentType?: string;
    siteKey?: string;
  };
  joomla?: {
    connectionType: CmsConnectionType;
    siteUrl: string;
    apiToken?: string;
    categoryId?: number;
    siteKey?: string;
  };
  linkedin?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    authorUrn: string;
    displayName?: string;
  };
  twitter?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    userId?: string;
    screenName?: string;
  };
  meta?: {
    accessToken: string;
    expiresAt?: number;
    pageId: string;
    pageName?: string;
    instagramAccountId?: string;
    instagramUsername?: string;
  };
  bluesky?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    did: string;
    handle?: string;
    sessionJson?: string;
  };
  mastodon?: {
    instanceUrl: string;
    accessToken: string;
    accountId: string;
    username: string;
    clientId: string;
    clientSecret: string;
  };
}

export type SocialPlatform =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook"
  | "bluesky"
  | "mastodon";

export type CmsPublishPlatform =
  | "ghost"
  | "webhook"
  | "shopify"
  | "drupal"
  | "joomla";

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
  "bluesky",
  "mastodon",
];

export const CMS_PUBLISH_PLATFORMS: CmsPublishPlatform[] = [
  "ghost",
  "webhook",
  "shopify",
  "drupal",
  "joomla",
];

export function resolveWordPressConnectionType(
  wordpress: NonNullable<CmsIntegrationCredentials["wordpress"]>,
): CmsConnectionType {
  return wordpress.connectionType ?? "api";
}

function secretHint(value: string): string {
  return value.length > 8 ? `...${value.slice(-4)}` : "****";
}

function tryDecrypt(value: string): string {
  try {
    return decryptSecret(value);
  } catch {
    return value;
  }
}

export function encryptCmsCredentials(creds: CmsIntegrationCredentials): CmsIntegrationCredentials {
  const result: CmsIntegrationCredentials = {};
  if (creds.notion) {
    result.notion = {
      integrationToken: encryptSecret(creds.notion.integrationToken),
      databaseId: creds.notion.databaseId,
    };
  }
  if (creds.webflow) {
    result.webflow = {
      apiToken: encryptSecret(creds.webflow.apiToken),
      collectionId: creds.webflow.collectionId,
      bodyFieldSlug: creds.webflow.bodyFieldSlug,
    };
  }
  if (creds.wordpress) {
    result.wordpress = {
      connectionType: creds.wordpress.connectionType ?? "api",
      siteUrl: creds.wordpress.siteUrl,
      username: creds.wordpress.username
        ? encryptSecret(creds.wordpress.username)
        : undefined,
      appPassword: creds.wordpress.appPassword
        ? encryptSecret(creds.wordpress.appPassword)
        : undefined,
      siteKey: creds.wordpress.siteKey
        ? encryptSecret(creds.wordpress.siteKey)
        : undefined,
    };
  }
  if (creds.ghost) {
    result.ghost = {
      apiUrl: creds.ghost.apiUrl,
      adminApiKey: encryptSecret(creds.ghost.adminApiKey),
    };
  }
  if (creds.webhook) {
    result.webhook = {
      url: creds.webhook.url,
      signingSecret: encryptSecret(creds.webhook.signingSecret),
    };
  }
  if (creds.shopify) {
    result.shopify = {
      connectionType: creds.shopify.connectionType,
      blogId: creds.shopify.blogId,
      shopDomain: creds.shopify.shopDomain,
      siteUrl: creds.shopify.siteUrl,
      accessToken: creds.shopify.accessToken
        ? encryptSecret(creds.shopify.accessToken)
        : undefined,
      siteKey: creds.shopify.siteKey
        ? encryptSecret(creds.shopify.siteKey)
        : undefined,
    };
  }
  if (creds.drupal) {
    result.drupal = {
      connectionType: creds.drupal.connectionType,
      siteUrl: creds.drupal.siteUrl,
      authType: creds.drupal.authType,
      contentType: creds.drupal.contentType,
      username: creds.drupal.username
        ? encryptSecret(creds.drupal.username)
        : undefined,
      password: creds.drupal.password
        ? encryptSecret(creds.drupal.password)
        : undefined,
      accessToken: creds.drupal.accessToken
        ? encryptSecret(creds.drupal.accessToken)
        : undefined,
      siteKey: creds.drupal.siteKey
        ? encryptSecret(creds.drupal.siteKey)
        : undefined,
    };
  }
  if (creds.joomla) {
    result.joomla = {
      connectionType: creds.joomla.connectionType,
      siteUrl: creds.joomla.siteUrl,
      categoryId: creds.joomla.categoryId,
      apiToken: creds.joomla.apiToken
        ? encryptSecret(creds.joomla.apiToken)
        : undefined,
      siteKey: creds.joomla.siteKey
        ? encryptSecret(creds.joomla.siteKey)
        : undefined,
    };
  }
  if (creds.linkedin) {
    result.linkedin = {
      accessToken: encryptSecret(creds.linkedin.accessToken),
      refreshToken: creds.linkedin.refreshToken ? encryptSecret(creds.linkedin.refreshToken) : undefined,
      expiresAt: creds.linkedin.expiresAt,
      authorUrn: creds.linkedin.authorUrn,
      displayName: creds.linkedin.displayName,
    };
  }
  if (creds.twitter) {
    result.twitter = {
      accessToken: encryptSecret(creds.twitter.accessToken),
      refreshToken: creds.twitter.refreshToken ? encryptSecret(creds.twitter.refreshToken) : undefined,
      expiresAt: creds.twitter.expiresAt,
      userId: creds.twitter.userId,
      screenName: creds.twitter.screenName,
    };
  }
  if (creds.meta) {
    result.meta = {
      accessToken: encryptSecret(creds.meta.accessToken),
      expiresAt: creds.meta.expiresAt,
      pageId: creds.meta.pageId,
      pageName: creds.meta.pageName,
      instagramAccountId: creds.meta.instagramAccountId,
      instagramUsername: creds.meta.instagramUsername,
    };
  }
  return result;
}

export function decryptCmsCredentials(stored: CmsIntegrationCredentials): CmsIntegrationCredentials {
  const result: CmsIntegrationCredentials = {};
  if (stored.notion) {
    result.notion = {
      integrationToken: tryDecrypt(stored.notion.integrationToken),
      databaseId: stored.notion.databaseId,
    };
  }
  if (stored.webflow) {
    result.webflow = {
      apiToken: tryDecrypt(stored.webflow.apiToken),
      collectionId: stored.webflow.collectionId,
      bodyFieldSlug: stored.webflow.bodyFieldSlug,
    };
  }
  if (stored.wordpress) {
    result.wordpress = {
      connectionType: stored.wordpress.connectionType ?? "api",
      siteUrl: stored.wordpress.siteUrl,
      username: stored.wordpress.username
        ? tryDecrypt(stored.wordpress.username)
        : undefined,
      appPassword: stored.wordpress.appPassword
        ? tryDecrypt(stored.wordpress.appPassword)
        : undefined,
      siteKey: stored.wordpress.siteKey
        ? tryDecrypt(stored.wordpress.siteKey)
        : undefined,
    };
  }
  if (stored.ghost) {
    result.ghost = {
      apiUrl: stored.ghost.apiUrl,
      adminApiKey: tryDecrypt(stored.ghost.adminApiKey),
    };
  }
  if (stored.webhook) {
    result.webhook = {
      url: stored.webhook.url,
      signingSecret: tryDecrypt(stored.webhook.signingSecret),
    };
  }
  if (stored.shopify) {
    result.shopify = {
      connectionType: stored.shopify.connectionType,
      blogId: stored.shopify.blogId,
      shopDomain: stored.shopify.shopDomain,
      siteUrl: stored.shopify.siteUrl,
      accessToken: stored.shopify.accessToken
        ? tryDecrypt(stored.shopify.accessToken)
        : undefined,
      siteKey: stored.shopify.siteKey
        ? tryDecrypt(stored.shopify.siteKey)
        : undefined,
    };
  }
  if (stored.drupal) {
    result.drupal = {
      connectionType: stored.drupal.connectionType,
      siteUrl: stored.drupal.siteUrl,
      authType: stored.drupal.authType,
      contentType: stored.drupal.contentType,
      username: stored.drupal.username
        ? tryDecrypt(stored.drupal.username)
        : undefined,
      password: stored.drupal.password
        ? tryDecrypt(stored.drupal.password)
        : undefined,
      accessToken: stored.drupal.accessToken
        ? tryDecrypt(stored.drupal.accessToken)
        : undefined,
      siteKey: stored.drupal.siteKey
        ? tryDecrypt(stored.drupal.siteKey)
        : undefined,
    };
  }
  if (stored.joomla) {
    result.joomla = {
      connectionType: stored.joomla.connectionType,
      siteUrl: stored.joomla.siteUrl,
      categoryId: stored.joomla.categoryId,
      apiToken: stored.joomla.apiToken
        ? tryDecrypt(stored.joomla.apiToken)
        : undefined,
      siteKey: stored.joomla.siteKey
        ? tryDecrypt(stored.joomla.siteKey)
        : undefined,
    };
  }
  if (stored.linkedin) {
    result.linkedin = {
      accessToken: tryDecrypt(stored.linkedin.accessToken),
      refreshToken: stored.linkedin.refreshToken
        ? tryDecrypt(stored.linkedin.refreshToken)
        : undefined,
      expiresAt: stored.linkedin.expiresAt,
      authorUrn: stored.linkedin.authorUrn,
      displayName: stored.linkedin.displayName,
    };
  }
  if (stored.twitter) {
    result.twitter = {
      accessToken: tryDecrypt(stored.twitter.accessToken),
      refreshToken: stored.twitter.refreshToken
        ? tryDecrypt(stored.twitter.refreshToken)
        : undefined,
      expiresAt: stored.twitter.expiresAt,
      userId: stored.twitter.userId,
      screenName: stored.twitter.screenName,
    };
  }
  if (stored.meta) {
    result.meta = {
      accessToken: tryDecrypt(stored.meta.accessToken),
      expiresAt: stored.meta.expiresAt,
      pageId: stored.meta.pageId,
      pageName: stored.meta.pageName,
      instagramAccountId: stored.meta.instagramAccountId,
      instagramUsername: stored.meta.instagramUsername,
    };
  }
  return result;
}

export function maskCmsCredentials(decrypted: CmsIntegrationCredentials): Record<string, unknown> {
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
      apiTokenHint: secretHint(decrypted.webflow.apiToken),
    };
  }
  if (decrypted.wordpress) {
    const connectionType = resolveWordPressConnectionType(decrypted.wordpress);
    result.wordpress = {
      connected: true,
      connectionType,
      siteUrl: decrypted.wordpress.siteUrl,
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
      adminApiKeyHint: secretHint(decrypted.ghost.adminApiKey),
    };
  }
  if (decrypted.webhook) {
    result.webhook = {
      connected: true,
      url: decrypted.webhook.url,
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
