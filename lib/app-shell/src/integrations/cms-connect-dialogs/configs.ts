import type {
  DrupalConnectPayload,
  GhostConnectPayload,
  JoomlaConnectPayload,
  NotionConnectPayload,
  ShopifyConnectPayload,
  WebflowConnectPayload,
  WordPressConnectPayload,
} from "../cms-connect-types";
import { CMS_CONNECT_STEPS } from "../connect-setup-steps";
import type { ConnectDialogConfig } from "./shared";

export const wordpressConfig: ConnectDialogConfig<WordPressConnectPayload> = {
  id: "wordpress",
  title: "Connect WordPress",
  setupSteps: CMS_CONNECT_STEPS.wordpress,
  defaultMode: "api",
  urlFields: ["siteUrl"],
  modes: [
    {
      key: "api",
      label: "REST API",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "username", label: "Username", type: "text", placeholder: "wordpress-user", autoComplete: "username" },
        { key: "appPassword", label: "Application password", type: "password", autoComplete: "new-password", hint: "Create one under Users → Profile → Application Passwords." },
      ],
    },
    {
      key: "plugin",
      label: "Plugin",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "siteKey", label: "Site key", type: "password", hint: "Copy the site key from the goals.ac WordPress plugin settings." },
      ],
    },
  ],
  buildPayload(v, mode) {
    const siteUrl = v.siteUrl.trim();
    if (mode === "plugin") {
      return { connectionType: "plugin", siteUrl, siteKey: v.siteKey.trim() } as WordPressConnectPayload;
    }
    return { connectionType: "api", siteUrl, username: v.username.trim(), appPassword: v.appPassword.trim() } as WordPressConnectPayload;
  },
};

export const ghostConfig: ConnectDialogConfig<GhostConnectPayload> = {
  id: "ghost",
  title: "Connect Ghost",
  setupSteps: CMS_CONNECT_STEPS.ghost,
  urlFields: ["apiUrl"],
  fields: [
    { key: "apiUrl", label: "Admin API URL", type: "url", placeholder: "https://example.com/ghost/api/admin", autoComplete: "url" },
    { key: "adminApiKey", label: "Admin API key", type: "password", hint: "Create an Admin API key in Ghost → Settings → Integrations." },
  ],
  buildPayload(v) {
    return { apiUrl: v.apiUrl.trim(), adminApiKey: v.adminApiKey.trim() };
  },
};

export const drupalConfig: ConnectDialogConfig<DrupalConnectPayload> = {
  id: "drupal",
  title: "Connect Drupal",
  setupSteps: CMS_CONNECT_STEPS.drupal,
  defaultMode: "plugin",
  urlFields: ["siteUrl"],
  modes: [
    {
      key: "plugin",
      label: "Plugin",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "siteKey", label: "Site key", type: "password", hint: "Copy the site key from the goals.ac Drupal module settings." },
      ],
    },
    {
      key: "api",
      label: "JSON:API",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "authType", label: "Auth type", type: "select", defaultValue: "basic", options: [{ value: "basic", label: "Basic auth" }, { value: "bearer", label: "Bearer token" }] },
        { key: "username", label: "Username", type: "text", autoComplete: "username", visibleWhen: (v) => v.authType !== "bearer" },
        { key: "password", label: "Password", type: "password", autoComplete: "current-password", visibleWhen: (v) => v.authType !== "bearer" },
        { key: "accessToken", label: "Access token", type: "password", visibleWhen: (v) => v.authType === "bearer" },
        { key: "contentType", label: "Content type machine name", type: "text", placeholder: "article", required: false, defaultValue: "article" },
      ],
    },
  ],
  buildPayload(v, mode) {
    const siteUrl = v.siteUrl.trim();
    if (mode === "plugin") {
      return { connectionType: "plugin", siteUrl, siteKey: v.siteKey.trim() } as DrupalConnectPayload;
    }
    const authType = (v.authType || "basic") as "basic" | "bearer";
    const payload: DrupalConnectPayload = { connectionType: "api", siteUrl, authType };
    if (authType === "bearer") {
      (payload as { accessToken?: string }).accessToken = v.accessToken.trim();
    } else {
      (payload as { username?: string; password?: string }).username = v.username.trim();
      (payload as { username?: string; password?: string }).password = v.password.trim();
    }
    const ct = v.contentType?.trim();
    if (ct) (payload as { contentType?: string }).contentType = ct;
    return payload;
  },
};

export const joomlaConfig: ConnectDialogConfig<JoomlaConnectPayload> = {
  id: "joomla",
  title: "Connect Joomla",
  setupSteps: CMS_CONNECT_STEPS.joomla,
  defaultMode: "plugin",
  urlFields: ["siteUrl"],
  modes: [
    {
      key: "plugin",
      label: "Plugin",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "siteKey", label: "Site key", type: "password", hint: "Copy the site key from the goals.ac Joomla plugin settings." },
      ],
    },
    {
      key: "api",
      label: "Web Services API",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "apiToken", label: "API token", type: "password", hint: "Create a token under System → Web Services → API Tokens." },
        { key: "categoryId", label: "Category ID (optional)", type: "number", placeholder: "2", required: false },
      ],
    },
  ],
  buildPayload(v, mode) {
    const siteUrl = v.siteUrl.trim();
    if (mode === "plugin") {
      return { connectionType: "plugin", siteUrl, siteKey: v.siteKey.trim() } as JoomlaConnectPayload;
    }
    const payload: JoomlaConnectPayload = { connectionType: "api", siteUrl, apiToken: v.apiToken.trim() };
    const cat = v.categoryId?.trim();
    if (cat) (payload as { categoryId?: number }).categoryId = Number(cat);
    return payload;
  },
};

export const notionConfig: ConnectDialogConfig<NotionConnectPayload> = {
  id: "notion",
  title: "Connect Notion",
  setupSteps: CMS_CONNECT_STEPS.notion,
  fields: [
    { key: "integrationToken", label: "Integration token", type: "password", placeholder: "secret_...", hint: "Create an integration at notion.so/my-integrations and share your database with it." },
    { key: "databaseId", label: "Database ID", type: "text", placeholder: "32-character hex ID from your database URL" },
  ],
  buildPayload(v) {
    return { integrationToken: v.integrationToken.trim(), databaseId: v.databaseId.trim() };
  },
};

export const webflowConfig: ConnectDialogConfig<WebflowConnectPayload> = {
  id: "webflow",
  title: "Connect Webflow",
  setupSteps: CMS_CONNECT_STEPS.webflow,
  fields: [
    { key: "apiToken", label: "API token", type: "password", placeholder: "Webflow site API token", hint: "Site Settings → Integrations → API access" },
    { key: "collectionId", label: "Collection ID", type: "text", placeholder: "64-character collection ID" },
    { key: "bodyFieldSlug", label: "Body field slug", type: "text", placeholder: "post-body", defaultValue: "post-body", hint: "Rich Text field slug in your collection (default: post-body)." },
  ],
  buildPayload(v) {
    return {
      apiToken: v.apiToken.trim(),
      collectionId: v.collectionId.trim(),
      bodyFieldSlug: v.bodyFieldSlug.trim() || "post-body",
    };
  },
};

export const shopifyConfig: ConnectDialogConfig<ShopifyConnectPayload> = {
  id: "shopify",
  title: "Connect Shopify",
  setupSteps: CMS_CONNECT_STEPS.shopify,
  defaultMode: "api",
  urlFields: ["siteUrl"],
  modes: [
    {
      key: "api",
      label: "Admin API",
      fields: [
        { key: "shopDomain", label: "Shop domain", type: "text", placeholder: "mystore.myshopify.com" },
        { key: "accessToken", label: "Admin API access token", type: "password" },
      ],
    },
    {
      key: "plugin",
      label: "Plugin",
      fields: [
        { key: "siteUrl", label: "App URL", type: "url", placeholder: "https://your-store.myshopify.com", autoComplete: "url" },
        { key: "siteKey", label: "Site key", type: "password", hint: "Copy the site key from the goals.ac Shopify app after installation." },
      ],
    },
  ],
  sharedFields: [
    { key: "blogId", label: "Blog ID (optional)", type: "text", placeholder: "gid://shopify/Blog/...", required: false },
  ],
  buildPayload(v, mode) {
    const blogId = v.blogId?.trim() || undefined;
    if (mode === "plugin") {
      return { connectionType: "plugin", siteUrl: v.siteUrl.trim(), siteKey: v.siteKey.trim(), ...(blogId ? { blogId } : {}) } as ShopifyConnectPayload;
    }
    return { connectionType: "api", shopDomain: v.shopDomain.trim(), accessToken: v.accessToken.trim(), ...(blogId ? { blogId } : {}) } as ShopifyConnectPayload;
  },
};
