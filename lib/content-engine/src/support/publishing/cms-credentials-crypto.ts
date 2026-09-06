import { encryptSecret, decryptSecret } from "@workspace/security/encryption";
import type { CmsIntegrationCredentials } from "./cms-integration-types";

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
      publishStatus: creds.webflow.publishStatus,
    };
  }
  if (creds.wordpress) {
    result.wordpress = {
      connectionType: creds.wordpress.connectionType ?? "api",
      siteUrl: creds.wordpress.siteUrl,
      editorMode: creds.wordpress.editorMode ?? creds.wordpress.outputMode,
      outputMode: creds.wordpress.outputMode ?? creds.wordpress.editorMode,
      seoPlugin: creds.wordpress.seoPlugin,
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
      outputMode: creds.ghost.outputMode,
    };
  }
  if (creds.webhook) {
    result.webhook = {
      url: creds.webhook.url,
      signingSecret: encryptSecret(creds.webhook.signingSecret),
      outputMode: creds.webhook.outputMode,
    };
  }
  if (creds.shopify) {
    result.shopify = {
      connectionType: creds.shopify.connectionType,
      blogId: creds.shopify.blogId,
      shopDomain: creds.shopify.shopDomain,
      siteUrl: creds.shopify.siteUrl,
      outputMode: creds.shopify.outputMode,
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
      outputMode: creds.drupal.outputMode,
      layoutStorageField: creds.drupal.layoutStorageField,
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
      outputMode: creds.joomla.outputMode,
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
  if (creds.bluesky) {
    result.bluesky = {
      accessToken: encryptSecret(creds.bluesky.accessToken),
      refreshToken: creds.bluesky.refreshToken ? encryptSecret(creds.bluesky.refreshToken) : undefined,
      expiresAt: creds.bluesky.expiresAt,
      did: creds.bluesky.did,
      handle: creds.bluesky.handle,
      sessionJson: creds.bluesky.sessionJson ? encryptSecret(creds.bluesky.sessionJson) : undefined,
    };
  }
  if (creds.mastodon) {
    result.mastodon = {
      instanceUrl: creds.mastodon.instanceUrl,
      accessToken: encryptSecret(creds.mastodon.accessToken),
      accountId: creds.mastodon.accountId,
      username: creds.mastodon.username,
      clientId: encryptSecret(creds.mastodon.clientId),
      clientSecret: encryptSecret(creds.mastodon.clientSecret),
    };
  }
  if (creds.wix) {
    result.wix = {
      accessToken: encryptSecret(creds.wix.accessToken),
      siteId: creds.wix.siteId,
      memberId: creds.wix.memberId,
      publishStatus: creds.wix.publishStatus,
    };
  }
  if (creds.framer) {
    result.framer = {
      apiToken: encryptSecret(creds.framer.apiToken),
      collectionId: creds.framer.collectionId,
      titleFieldSlug: creds.framer.titleFieldSlug,
      bodyFieldSlug: creds.framer.bodyFieldSlug,
      publishStatus: creds.framer.publishStatus,
    };
  }
  if (creds.squarespace) {
    result.squarespace = {
      apiKey: encryptSecret(creds.squarespace.apiKey),
      siteId: creds.squarespace.siteId,
      publishStatus: creds.squarespace.publishStatus,
    };
  }
  if (creds.contentful) {
    result.contentful = {
      accessToken: encryptSecret(creds.contentful.accessToken),
      spaceId: creds.contentful.spaceId,
      environmentId: creds.contentful.environmentId,
      contentTypeId: creds.contentful.contentTypeId,
      fieldMapping: creds.contentful.fieldMapping,
    };
  }
  if (creds.sanity) {
    result.sanity = {
      projectId: creds.sanity.projectId,
      dataset: creds.sanity.dataset,
      token: encryptSecret(creds.sanity.token),
      documentType: creds.sanity.documentType,
      fieldMapping: creds.sanity.fieldMapping,
    };
  }
  if (creds.strapi) {
    result.strapi = {
      baseUrl: creds.strapi.baseUrl,
      apiToken: encryptSecret(creds.strapi.apiToken),
      contentType: creds.strapi.contentType,
      publishStatus: creds.strapi.publishStatus,
    };
  }
  if (creds.beehiiv) {
    result.beehiiv = {
      apiKey: encryptSecret(creds.beehiiv.apiKey),
      publicationId: creds.beehiiv.publicationId,
    };
  }
  if (creds.convertkit) {
    result.convertkit = {
      apiSecret: encryptSecret(creds.convertkit.apiSecret),
      formId: creds.convertkit.formId,
    };
  }
  if (creds.mailchimp) {
    result.mailchimp = {
      apiKey: encryptSecret(creds.mailchimp.apiKey),
      serverPrefix: creds.mailchimp.serverPrefix,
      listId: creds.mailchimp.listId,
    };
  }
  if (creds.hubspot) {
    result.hubspot = {
      accessToken: encryptSecret(creds.hubspot.accessToken),
      blogId: creds.hubspot.blogId,
      publishStatus: creds.hubspot.publishStatus,
    };
  }
  if (creds.typo3) {
    result.typo3 = {
      connectionType: creds.typo3.connectionType,
      siteUrl: creds.typo3.siteUrl,
      outputMode: creds.typo3.outputMode,
      siteKey: encryptSecret(creds.typo3.siteKey),
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
      publishStatus: stored.webflow.publishStatus,
    };
  }
  if (stored.wordpress) {
    result.wordpress = {
      connectionType: stored.wordpress.connectionType ?? "api",
      siteUrl: stored.wordpress.siteUrl,
      editorMode: stored.wordpress.editorMode ?? stored.wordpress.outputMode,
      outputMode: stored.wordpress.outputMode ?? stored.wordpress.editorMode,
      seoPlugin: stored.wordpress.seoPlugin,
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
      outputMode: stored.ghost.outputMode,
    };
  }
  if (stored.webhook) {
    result.webhook = {
      url: stored.webhook.url,
      signingSecret: tryDecrypt(stored.webhook.signingSecret),
      outputMode: stored.webhook.outputMode,
    };
  }
  if (stored.shopify) {
    result.shopify = {
      connectionType: stored.shopify.connectionType,
      blogId: stored.shopify.blogId,
      shopDomain: stored.shopify.shopDomain,
      siteUrl: stored.shopify.siteUrl,
      outputMode: stored.shopify.outputMode,
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
      outputMode: stored.drupal.outputMode,
      layoutStorageField: stored.drupal.layoutStorageField,
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
      outputMode: stored.joomla.outputMode,
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
  if (stored.bluesky) {
    result.bluesky = {
      accessToken: tryDecrypt(stored.bluesky.accessToken),
      refreshToken: stored.bluesky.refreshToken
        ? tryDecrypt(stored.bluesky.refreshToken)
        : undefined,
      expiresAt: stored.bluesky.expiresAt,
      did: stored.bluesky.did,
      handle: stored.bluesky.handle,
      sessionJson: stored.bluesky.sessionJson
        ? tryDecrypt(stored.bluesky.sessionJson)
        : undefined,
    };
  }
  if (stored.mastodon) {
    result.mastodon = {
      instanceUrl: stored.mastodon.instanceUrl,
      accessToken: tryDecrypt(stored.mastodon.accessToken),
      accountId: stored.mastodon.accountId,
      username: stored.mastodon.username,
      clientId: tryDecrypt(stored.mastodon.clientId),
      clientSecret: tryDecrypt(stored.mastodon.clientSecret),
    };
  }
  if (stored.wix) {
    result.wix = {
      accessToken: tryDecrypt(stored.wix.accessToken),
      siteId: stored.wix.siteId,
      memberId: stored.wix.memberId,
      publishStatus: stored.wix.publishStatus,
    };
  }
  if (stored.framer) {
    result.framer = {
      apiToken: tryDecrypt(stored.framer.apiToken),
      collectionId: stored.framer.collectionId,
      titleFieldSlug: stored.framer.titleFieldSlug,
      bodyFieldSlug: stored.framer.bodyFieldSlug,
      publishStatus: stored.framer.publishStatus,
    };
  }
  if (stored.squarespace) {
    result.squarespace = {
      apiKey: tryDecrypt(stored.squarespace.apiKey),
      siteId: stored.squarespace.siteId,
      publishStatus: stored.squarespace.publishStatus,
    };
  }
  if (stored.contentful) {
    result.contentful = {
      accessToken: tryDecrypt(stored.contentful.accessToken),
      spaceId: stored.contentful.spaceId,
      environmentId: stored.contentful.environmentId,
      contentTypeId: stored.contentful.contentTypeId,
      fieldMapping: stored.contentful.fieldMapping,
    };
  }
  if (stored.sanity) {
    result.sanity = {
      projectId: stored.sanity.projectId,
      dataset: stored.sanity.dataset,
      token: tryDecrypt(stored.sanity.token),
      documentType: stored.sanity.documentType,
      fieldMapping: stored.sanity.fieldMapping,
    };
  }
  if (stored.strapi) {
    result.strapi = {
      baseUrl: stored.strapi.baseUrl,
      apiToken: tryDecrypt(stored.strapi.apiToken),
      contentType: stored.strapi.contentType,
      publishStatus: stored.strapi.publishStatus,
    };
  }
  if (stored.beehiiv) {
    result.beehiiv = {
      apiKey: tryDecrypt(stored.beehiiv.apiKey),
      publicationId: stored.beehiiv.publicationId,
    };
  }
  if (stored.convertkit) {
    result.convertkit = {
      apiSecret: tryDecrypt(stored.convertkit.apiSecret),
      formId: stored.convertkit.formId,
    };
  }
  if (stored.mailchimp) {
    result.mailchimp = {
      apiKey: tryDecrypt(stored.mailchimp.apiKey),
      serverPrefix: stored.mailchimp.serverPrefix,
      listId: stored.mailchimp.listId,
    };
  }
  if (stored.hubspot) {
    result.hubspot = {
      accessToken: tryDecrypt(stored.hubspot.accessToken),
      blogId: stored.hubspot.blogId,
      publishStatus: stored.hubspot.publishStatus,
    };
  }
  if (stored.typo3) {
    result.typo3 = {
      connectionType: stored.typo3.connectionType,
      siteUrl: stored.typo3.siteUrl,
      outputMode: stored.typo3.outputMode,
      siteKey: tryDecrypt(stored.typo3.siteKey),
    };
  }
  return result;
}
