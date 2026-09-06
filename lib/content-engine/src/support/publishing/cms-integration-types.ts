export type CmsConnectionType = "api" | "plugin";

export type WordPressEditorMode = "classic" | "gutenberg" | "elementor" | "divi";

export interface CmsFieldMapping {
  titleField?: string;
  bodyField?: string;
  slugField?: string;
  metaDescriptionField?: string;
}

export interface CmsIntegrationCredentials {
  notion?: {
    integrationToken: string;
    databaseId: string;
  };
  webflow?: {
    apiToken: string;
    collectionId: string;
    bodyFieldSlug: string;
    publishStatus?: "draft" | "live";
  };
  wordpress?: {
    connectionType?: CmsConnectionType;
    siteUrl: string;
    username?: string;
    appPassword?: string;
    siteKey?: string;
    /** How WordPress should store post body content (default: classic HTML) */
    editorMode?: WordPressEditorMode;
    outputMode?: WordPressEditorMode;
    /**
     * Last health-reported SEO plugin (`yoast` | `rankmath` | `aioseo` |
     * `seopress` | `none`). Drives REST meta key selection so publishes do
     * not spam every plugin's keys onto the post.
     */
    seoPlugin?: "yoast" | "rankmath" | "aioseo" | "seopress" | "none";
  };
  ghost?: {
    apiUrl: string;
    adminApiKey: string;
    outputMode?: "html" | "lexical";
  };
  webhook?: {
    url: string;
    signingSecret: string;
    outputMode?: "both" | "markdown" | "html" | "full";
  };
  shopify?: {
    connectionType: CmsConnectionType;
    shopDomain?: string;
    accessToken?: string;
    blogId?: string;
    siteUrl?: string;
    siteKey?: string;
    outputMode?: "article_html" | "article_metafields" | "page_sections" | "markdown" | "html";
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
    outputMode?: "body_html" | "layout_builder" | "markdown" | "html";
    layoutStorageField?: string;
  };
  joomla?: {
    connectionType: CmsConnectionType;
    siteUrl: string;
    apiToken?: string;
    categoryId?: number;
    siteKey?: string;
    outputMode?: "markdown" | "html";
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
  wix?: {
    accessToken: string;
    siteId: string;
    memberId?: string;
    publishStatus?: "draft" | "live";
  };
  framer?: {
    apiToken: string;
    collectionId: string;
    titleFieldSlug: string;
    bodyFieldSlug: string;
    publishStatus?: "draft" | "live";
  };
  squarespace?: {
    apiKey: string;
    siteId: string;
    publishStatus?: "draft" | "live";
  };
  contentful?: {
    accessToken: string;
    spaceId: string;
    environmentId: string;
    contentTypeId: string;
    fieldMapping: CmsFieldMapping;
  };
  sanity?: {
    projectId: string;
    dataset: string;
    token: string;
    documentType: string;
    fieldMapping: CmsFieldMapping;
  };
  strapi?: {
    baseUrl: string;
    apiToken: string;
    contentType: string;
    publishStatus?: "draft" | "live";
  };
  beehiiv?: {
    apiKey: string;
    publicationId: string;
  };
  convertkit?: {
    apiSecret: string;
    formId?: string;
  };
  mailchimp?: {
    apiKey: string;
    serverPrefix: string;
    listId: string;
  };
  hubspot?: {
    accessToken: string;
    blogId: string;
    publishStatus?: "draft" | "live";
  };
  typo3?: {
    connectionType: CmsConnectionType;
    siteUrl: string;
    siteKey: string;
    outputMode?: "body_text" | "content_elements";
  };
}
