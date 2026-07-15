export type WordPressConnectPayload =
  | {
      connectionType: "api";
      siteUrl: string;
      username: string;
      appPassword: string;
    }
  | {
      connectionType: "plugin";
      siteUrl: string;
      siteKey: string;
    };

export type GhostConnectPayload = {
  apiUrl: string;
  adminApiKey: string;
};

export type DrupalConnectPayload =
  | {
      connectionType: "plugin";
      siteUrl: string;
      siteKey: string;
    }
  | {
      connectionType: "api";
      siteUrl: string;
      authType: "basic" | "bearer";
      username?: string;
      password?: string;
      accessToken?: string;
      contentType?: string;
    };

export type JoomlaConnectPayload =
  | {
      connectionType: "plugin";
      siteUrl: string;
      siteKey: string;
    }
  | {
      connectionType: "api";
      siteUrl: string;
      apiToken: string;
      categoryId?: number;
    };

export type NotionConnectPayload = {
  integrationToken: string;
  databaseId: string;
};

export type WebflowConnectPayload = {
  apiToken: string;
  collectionId: string;
  bodyFieldSlug: string;
};

export type ShopifyConnectPayload =
  | {
      connectionType: "api";
      shopDomain: string;
      accessToken: string;
      blogId?: string;
    }
  | {
      connectionType: "plugin";
      siteUrl: string;
      siteKey: string;
      blogId?: string;
    };

export const CMS_NATIVE_CONNECT_PLATFORMS = new Set([
  "wordpress",
  "ghost",
  "drupal",
  "joomla",
  "notion",
  "webflow",
  "shopify",
]);
