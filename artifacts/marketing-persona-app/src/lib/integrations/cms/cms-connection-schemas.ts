import type { ConnectionMethod, PublishDestinationId } from "../../projects/publishing-destinations";
import {
  getDefaultOutputMode,
  getOutputModes,
  outputModeLabel,
} from "@workspace/content-engine/support/publishing/platform-output-modes";

export type ConnectionFieldType = "text" | "password" | "url" | "number" | "select";

export interface ConnectionFieldOption {
  value: string;
  label: string;
}

export interface ConnectionFieldDef {
  key: string;
  label: string;
  type: ConnectionFieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  options?: ConnectionFieldOption[];
  when?: {
    connectionMethod?: ConnectionMethod[];
    authType?: string[];
  };
}

export interface ConnectedDetailRow {
  label: string;
  value: string;
}

export interface CmsConnectionSchema {
  fields: ConnectionFieldDef[];
  buildPayload: (
    values: Record<string, string>,
    connectionMethod: ConnectionMethod,
  ) => unknown;
  canSubmit: (
    values: Record<string, string>,
    connectionMethod: ConnectionMethod,
  ) => boolean;
  connectedDetails: (integration: Record<string, unknown>) => ConnectedDetailRow[];
  resetValues: () => Record<string, string>;
}

function trim(values: Record<string, string>, key: string): string {
  return (values[key] ?? "").trim();
}

function has(values: Record<string, string>, key: string): boolean {
  return trim(values, key).length > 0;
}

export function buildOutputModeField(platform: string): ConnectionFieldDef {
  const options = getOutputModes(platform);
  const defaultMode = getDefaultOutputMode(platform);
  return {
    key: "outputMode",
    label: "Output format",
    type: "select",
    defaultValue: defaultMode,
    options: options.map((option) => ({ value: option.value, label: option.label })),
    hint:
      options.find((option) => option.value === defaultMode)?.hint ??
      "How goals.ac formats content for this platform.",
  };
}

function resolveStoredOutputMode(platform: string, integration: Record<string, unknown>): string {
  if (platform === "wordpress") {
    return String(integration.outputMode ?? integration.editorMode ?? getDefaultOutputMode(platform));
  }
  return String(integration.outputMode ?? getDefaultOutputMode(platform));
}

function outputModeDetailRow(
  platform: string,
  integration: Record<string, unknown>,
): ConnectedDetailRow | null {
  const mode = resolveStoredOutputMode(platform, integration);
  if (!mode) return null;
  return { label: "Output format", value: outputModeLabel(platform, mode) };
}

function appendOutputMode(values: Record<string, string>, platform: string): Record<string, unknown> {
  const outputMode = trim(values, "outputMode") || getDefaultOutputMode(platform);
  if (platform === "wordpress") {
    return { outputMode, editorMode: outputMode };
  }
  return { outputMode };
}

const CMS_CONNECTION_SCHEMAS: Partial<Record<PublishDestinationId, CmsConnectionSchema>> = {
  notion: {
    fields: [
      {
        key: "integrationToken",
        label: "Integration Token",
        type: "password",
        placeholder: "secret_...",
        hint: "Create an integration at notion.so/my-integrations and share your database with it.",
        required: true,
      },
      {
        key: "databaseId",
        label: "Database ID",
        type: "text",
        placeholder: "32-character hex ID from your database URL",
        required: true,
      },
    ],
    buildPayload: (values) => ({
      integrationToken: trim(values, "integrationToken"),
      databaseId: trim(values, "databaseId"),
    }),
    canSubmit: (values) => has(values, "integrationToken") && has(values, "databaseId"),
    connectedDetails: (integration) => [
      { label: "Database ID", value: String(integration.databaseId ?? "") },
      { label: "Token", value: String(integration.integrationTokenHint ?? "") },
    ],
    resetValues: () => ({ integrationToken: "", databaseId: "" }),
  },
  webflow: {
    fields: [
      {
        key: "apiToken",
        label: "API Token",
        type: "password",
        placeholder: "Webflow site API token",
        hint: "Site Settings → Integrations → API access",
        required: true,
      },
      {
        key: "collectionId",
        label: "Collection ID",
        type: "text",
        placeholder: "64-character collection ID",
        required: true,
      },
      {
        key: "bodyFieldSlug",
        label: "Body field slug",
        type: "text",
        placeholder: "post-body",
        defaultValue: "post-body",
        hint: "Rich Text field slug in your collection (default: post-body).",
      },
      {
        key: "publishStatus",
        label: "Publish mode",
        type: "select",
        defaultValue: "draft",
        options: [
          { value: "draft", label: "Save as draft" },
          { value: "live", label: "Publish live" },
        ],
      },
    ],
    buildPayload: (values) => ({
      apiToken: trim(values, "apiToken"),
      collectionId: trim(values, "collectionId"),
      bodyFieldSlug: trim(values, "bodyFieldSlug") || "post-body",
      publishStatus: (trim(values, "publishStatus") || "draft") as "draft" | "live",
    }),
    canSubmit: (values) => has(values, "apiToken") && has(values, "collectionId"),
    connectedDetails: (integration) => [
      { label: "Collection ID", value: String(integration.collectionId ?? "") },
      { label: "Body field", value: String(integration.bodyFieldSlug ?? "") },
      { label: "Token", value: String(integration.apiTokenHint ?? "") },
    ],
    resetValues: () => ({ apiToken: "", collectionId: "", bodyFieldSlug: "post-body" }),
  },
  wordpress: {
    fields: [
      {
        key: "siteUrl",
        label: "WordPress Site URL",
        type: "url",
        placeholder: "https://yoursite.com",
        required: true,
      },
      {
        key: "username",
        label: "WordPress Username",
        type: "text",
        placeholder: "admin",
        required: true,
        when: { connectionMethod: ["api"] },
      },
      {
        key: "appPassword",
        label: "Application Password",
        type: "password",
        placeholder: "xxxx xxxx xxxx xxxx xxxx xxxx",
        hint: "Users → Profile → Application Passwords in WordPress.",
        required: true,
        when: { connectionMethod: ["api"] },
      },
      {
        key: "siteKey",
        label: "Site key",
        type: "password",
        placeholder: "From the goals.ac WordPress plugin",
        hint: "Install the goals.ac plugin and copy the site key from its settings page.",
        required: true,
        when: { connectionMethod: ["plugin"] },
      },
      {
        ...buildOutputModeField("wordpress"),
        when: { connectionMethod: ["api", "plugin"] },
      },
    ],
    buildPayload: (values, connectionMethod) => {
      const modeFields = appendOutputMode(values, "wordpress");
      return connectionMethod === "plugin"
        ? {
            connectionType: "plugin" as const,
            siteUrl: trim(values, "siteUrl"),
            siteKey: trim(values, "siteKey"),
            ...modeFields,
          }
        : {
            connectionType: "api" as const,
            siteUrl: trim(values, "siteUrl"),
            username: trim(values, "username"),
            appPassword: trim(values, "appPassword"),
            ...modeFields,
          };
    },
    canSubmit: (values, connectionMethod) => {
      if (!has(values, "siteUrl")) return false;
      if (connectionMethod === "plugin") return has(values, "siteKey");
      return has(values, "username") && has(values, "appPassword");
    },
    connectedDetails: (integration) => {
      const rows: ConnectedDetailRow[] = [
        {
          label: "Method",
          value:
            integration.connectionType === "plugin"
              ? "goals.ac plugin"
              : "Application Password",
        },
        { label: "Site URL", value: String(integration.siteUrl ?? "") },
      ];
      if (integration.usernameHint) {
        rows.push({ label: "Username", value: String(integration.usernameHint) });
      }
      const outputRow = outputModeDetailRow("wordpress", integration);
      if (outputRow) rows.push(outputRow);
      return rows;
    },
    resetValues: () => ({
      siteUrl: "",
      username: "",
      appPassword: "",
      siteKey: "",
    }),
  },
  ghost: {
    fields: [
      {
        key: "apiUrl",
        label: "Ghost Site URL",
        type: "url",
        placeholder: "https://yourblog.ghost.io",
        required: true,
      },
      {
        key: "adminApiKey",
        label: "Admin API Key",
        type: "password",
        placeholder: "id:secret",
        hint: "Ghost Admin → Settings → Integrations → Add custom integration.",
        required: true,
      },
      buildOutputModeField("ghost"),
    ],
    buildPayload: (values) => ({
      apiUrl: trim(values, "apiUrl"),
      adminApiKey: trim(values, "adminApiKey"),
      ...appendOutputMode(values, "ghost"),
    }),
    canSubmit: (values) => has(values, "apiUrl") && has(values, "adminApiKey"),
    connectedDetails: (integration) => {
      const rows: ConnectedDetailRow[] = [
        { label: "API URL", value: String(integration.apiUrl ?? "") },
      ];
      const outputRow = outputModeDetailRow("ghost", integration);
      if (outputRow) rows.push(outputRow);
      return rows;
    },
    resetValues: () => ({ apiUrl: "", adminApiKey: "" }),
  },
  webhook: {
    fields: [
      {
        key: "url",
        label: "Webhook URL",
        type: "url",
        placeholder: "https://hooks.zapier.com/...",
        required: true,
      },
      {
        key: "signingSecret",
        label: "Signing secret",
        type: "password",
        required: true,
      },
      buildOutputModeField("webhook"),
    ],
    buildPayload: (values) => ({
      url: trim(values, "url"),
      signingSecret: trim(values, "signingSecret"),
      ...appendOutputMode(values, "webhook"),
    }),
    canSubmit: (values) => has(values, "url") && has(values, "signingSecret"),
    connectedDetails: (integration) => {
      const rows: ConnectedDetailRow[] = [
        { label: "URL", value: String(integration.url ?? "") },
      ];
      const outputRow = outputModeDetailRow("webhook", integration);
      if (outputRow) rows.push(outputRow);
      return rows;
    },
    resetValues: () => ({ url: "", signingSecret: "" }),
  },
  shopify: {
    fields: [
      {
        key: "shopDomain",
        label: "Shop domain",
        type: "text",
        placeholder: "mystore.myshopify.com",
        required: true,
        when: { connectionMethod: ["api"] },
      },
      {
        key: "accessToken",
        label: "Admin API access token",
        type: "password",
        required: true,
        when: { connectionMethod: ["api"] },
      },
      {
        key: "siteUrl",
        label: "App URL",
        type: "url",
        placeholder: "https://your-store.myshopify.com",
        required: true,
        when: { connectionMethod: ["plugin"] },
      },
      {
        key: "siteKey",
        label: "Site key",
        type: "password",
        hint: "From the goals.ac Shopify app after installation.",
        required: true,
        when: { connectionMethod: ["plugin"] },
      },
      {
        key: "blogId",
        label: "Blog ID (optional)",
        type: "text",
        placeholder: "gid://shopify/Blog/...",
      },
      buildOutputModeField("shopify"),
    ],
    buildPayload: (values, connectionMethod) => {
      const blogId = trim(values, "blogId");
      const base =
        connectionMethod === "plugin"
          ? {
              connectionType: "plugin" as const,
              siteUrl: trim(values, "siteUrl"),
              siteKey: trim(values, "siteKey"),
            }
          : {
              connectionType: "api" as const,
              shopDomain: trim(values, "shopDomain"),
              accessToken: trim(values, "accessToken"),
            };
      const payload = { ...base, ...appendOutputMode(values, "shopify") };
      return blogId ? { ...payload, blogId } : payload;
    },
    canSubmit: (values, connectionMethod) => {
      if (connectionMethod === "plugin") {
        return has(values, "siteUrl") && has(values, "siteKey");
      }
      return has(values, "shopDomain") && has(values, "accessToken");
    },
    connectedDetails: (integration) => {
      const rows: ConnectedDetailRow[] = [
        {
          label: "Method",
          value: integration.connectionType === "plugin" ? "goals.ac plugin" : "Admin API",
        },
        {
          label: "Site",
          value: String(integration.siteUrl ?? integration.shopDomain ?? ""),
        },
      ];
      const outputRow = outputModeDetailRow("shopify", integration);
      if (outputRow) rows.push(outputRow);
      return rows;
    },
    resetValues: () => ({
      shopDomain: "",
      accessToken: "",
      siteUrl: "",
      siteKey: "",
      blogId: "",
    }),
  },
  drupal: {
    fields: [
      {
        key: "siteUrl",
        label: "Site URL",
        type: "url",
        placeholder: "https://yoursite.com",
        required: true,
      },
      {
        key: "siteKey",
        label: "Site key",
        type: "password",
        required: true,
        when: { connectionMethod: ["plugin"] },
      },
      {
        key: "authType",
        label: "Auth type",
        type: "select",
        defaultValue: "basic",
        options: [
          { value: "basic", label: "Basic auth" },
          { value: "bearer", label: "Bearer token" },
        ],
        when: { connectionMethod: ["api"] },
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        when: { connectionMethod: ["api"], authType: ["basic"] },
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        when: { connectionMethod: ["api"], authType: ["basic"] },
      },
      {
        key: "accessToken",
        label: "Access token",
        type: "password",
        when: { connectionMethod: ["api"], authType: ["bearer"] },
      },
      {
        key: "contentType",
        label: "Content type machine name",
        type: "text",
        placeholder: "article",
        defaultValue: "article",
        when: { connectionMethod: ["api"] },
      },
      buildOutputModeField("drupal"),
    ],
    buildPayload: (values, connectionMethod) => {
      const modeFields = appendOutputMode(values, "drupal");
      if (connectionMethod === "plugin") {
        return {
          connectionType: "plugin" as const,
          siteUrl: trim(values, "siteUrl"),
          siteKey: trim(values, "siteKey"),
          ...modeFields,
        };
      }
      const authType = (trim(values, "authType") || "basic") as "basic" | "bearer";
      const payload: Record<string, unknown> = {
        connectionType: "api" as const,
        siteUrl: trim(values, "siteUrl"),
        authType,
        ...modeFields,
      };
      if (authType === "bearer") {
        payload.accessToken = trim(values, "accessToken");
      } else {
        payload.username = trim(values, "username");
        payload.password = trim(values, "password");
      }
      const contentType = trim(values, "contentType");
      if (contentType) payload.contentType = contentType;
      return payload;
    },
    canSubmit: (values, connectionMethod) => {
      if (!has(values, "siteUrl")) return false;
      if (connectionMethod === "plugin") return has(values, "siteKey");
      const authType = trim(values, "authType") || "basic";
      if (authType === "bearer") return has(values, "accessToken");
      return has(values, "username") && has(values, "password");
    },
    connectedDetails: (integration) => {
      const rows: ConnectedDetailRow[] = [
        {
          label: "Method",
          value: integration.connectionType === "plugin" ? "goals.ac plugin" : "JSON:API",
        },
        { label: "Site", value: String(integration.siteUrl ?? "") },
      ];
      const outputRow = outputModeDetailRow("drupal", integration);
      if (outputRow) rows.push(outputRow);
      return rows;
    },
    resetValues: () => ({
      siteUrl: "",
      siteKey: "",
      authType: "basic",
      username: "",
      password: "",
      accessToken: "",
      contentType: "article",
    }),
  },
  joomla: {
    fields: [
      {
        key: "siteUrl",
        label: "Site URL",
        type: "url",
        placeholder: "https://yoursite.com",
        required: true,
      },
      {
        key: "siteKey",
        label: "Site key",
        type: "password",
        required: true,
        when: { connectionMethod: ["plugin"] },
      },
      {
        key: "apiToken",
        label: "API token",
        type: "password",
        required: true,
        when: { connectionMethod: ["api"] },
      },
      {
        key: "categoryId",
        label: "Category ID (optional)",
        type: "number",
        placeholder: "2",
        when: { connectionMethod: ["api"] },
      },
      buildOutputModeField("joomla"),
    ],
    buildPayload: (values, connectionMethod) => {
      const modeFields = appendOutputMode(values, "joomla");
      if (connectionMethod === "plugin") {
        return {
          connectionType: "plugin" as const,
          siteUrl: trim(values, "siteUrl"),
          siteKey: trim(values, "siteKey"),
          ...modeFields,
        };
      }
      const payload: Record<string, unknown> = {
        connectionType: "api" as const,
        siteUrl: trim(values, "siteUrl"),
        apiToken: trim(values, "apiToken"),
        ...modeFields,
      };
      const categoryId = trim(values, "categoryId");
      if (categoryId) payload.categoryId = Number(categoryId);
      return payload;
    },
    canSubmit: (values, connectionMethod) => {
      if (!has(values, "siteUrl")) return false;
      if (connectionMethod === "plugin") return has(values, "siteKey");
      return has(values, "apiToken");
    },
    connectedDetails: (integration) => {
      const rows: ConnectedDetailRow[] = [
        {
          label: "Method",
          value: integration.connectionType === "plugin" ? "goals.ac plugin" : "Web Services API",
        },
        { label: "Site", value: String(integration.siteUrl ?? "") },
      ];
      const outputRow = outputModeDetailRow("joomla", integration);
      if (outputRow) rows.push(outputRow);
      return rows;
    },
    resetValues: () => ({
      siteUrl: "",
      siteKey: "",
      apiToken: "",
      categoryId: "",
    }),
  },
  wix: {
    fields: [
      { key: "accessToken", label: "Access token", type: "password", required: true },
      { key: "siteId", label: "Site ID", type: "text", required: true },
      {
        key: "publishStatus",
        label: "Publish mode",
        type: "select",
        defaultValue: "draft",
        options: [
          { value: "draft", label: "Draft" },
          { value: "live", label: "Live" },
        ],
      },
    ],
    buildPayload: (values) => ({
      accessToken: trim(values, "accessToken"),
      siteId: trim(values, "siteId"),
      publishStatus: (trim(values, "publishStatus") || "draft") as "draft" | "live",
    }),
    canSubmit: (values) => has(values, "accessToken") && has(values, "siteId"),
    connectedDetails: (integration) => [
      { label: "Site ID", value: String(integration.siteId ?? "") },
    ],
    resetValues: () => ({ accessToken: "", siteId: "", publishStatus: "draft" }),
  },
  framer: {
    fields: [
      { key: "apiToken", label: "API token", type: "password", required: true },
      { key: "collectionId", label: "Collection ID", type: "text", required: true },
      { key: "titleFieldSlug", label: "Title field slug", type: "text", defaultValue: "title", required: true },
      { key: "bodyFieldSlug", label: "Body field slug", type: "text", defaultValue: "body", required: true },
      {
        key: "publishStatus",
        label: "Publish mode",
        type: "select",
        defaultValue: "draft",
        options: [
          { value: "draft", label: "Draft" },
          { value: "live", label: "Live" },
        ],
      },
    ],
    buildPayload: (values) => ({
      apiToken: trim(values, "apiToken"),
      collectionId: trim(values, "collectionId"),
      titleFieldSlug: trim(values, "titleFieldSlug") || "title",
      bodyFieldSlug: trim(values, "bodyFieldSlug") || "body",
      publishStatus: (trim(values, "publishStatus") || "draft") as "draft" | "live",
    }),
    canSubmit: (values) =>
      has(values, "apiToken") && has(values, "collectionId") && has(values, "titleFieldSlug"),
    connectedDetails: (integration) => [
      { label: "Collection", value: String(integration.collectionId ?? "") },
    ],
    resetValues: () => ({
      apiToken: "",
      collectionId: "",
      titleFieldSlug: "title",
      bodyFieldSlug: "body",
      publishStatus: "draft",
    }),
  },
  squarespace: {
    fields: [
      { key: "apiKey", label: "API key", type: "password", required: true },
      { key: "siteId", label: "Blog ID", type: "text", required: true },
      {
        key: "publishStatus",
        label: "Publish mode",
        type: "select",
        defaultValue: "draft",
        options: [
          { value: "draft", label: "Draft" },
          { value: "live", label: "Live" },
        ],
      },
    ],
    buildPayload: (values) => ({
      apiKey: trim(values, "apiKey"),
      siteId: trim(values, "siteId"),
      publishStatus: (trim(values, "publishStatus") || "draft") as "draft" | "live",
    }),
    canSubmit: (values) => has(values, "apiKey") && has(values, "siteId"),
    connectedDetails: (integration) => [
      { label: "Blog ID", value: String(integration.siteId ?? "") },
    ],
    resetValues: () => ({ apiKey: "", siteId: "", publishStatus: "draft" }),
  },
  contentful: {
    fields: [
      { key: "accessToken", label: "Management token", type: "password", required: true },
      { key: "spaceId", label: "Space ID", type: "text", required: true },
      { key: "environmentId", label: "Environment ID", type: "text", defaultValue: "master", required: true },
      { key: "contentTypeId", label: "Content type ID", type: "text", required: true },
      { key: "titleField", label: "Title field ID", type: "text", defaultValue: "title" },
      { key: "bodyField", label: "Body field ID", type: "text", defaultValue: "body" },
      { key: "slugField", label: "Slug field ID", type: "text", defaultValue: "slug" },
    ],
    buildPayload: (values) => ({
      accessToken: trim(values, "accessToken"),
      spaceId: trim(values, "spaceId"),
      environmentId: trim(values, "environmentId") || "master",
      contentTypeId: trim(values, "contentTypeId"),
      fieldMapping: {
        titleField: trim(values, "titleField") || "title",
        bodyField: trim(values, "bodyField") || "body",
        slugField: trim(values, "slugField") || "slug",
      },
    }),
    canSubmit: (values) =>
      has(values, "accessToken") && has(values, "spaceId") && has(values, "contentTypeId"),
    connectedDetails: (integration) => [
      { label: "Space", value: String(integration.spaceId ?? "") },
      { label: "Content type", value: String(integration.contentTypeId ?? "") },
    ],
    resetValues: () => ({
      accessToken: "",
      spaceId: "",
      environmentId: "master",
      contentTypeId: "",
      titleField: "title",
      bodyField: "body",
      slugField: "slug",
    }),
  },
  sanity: {
    fields: [
      { key: "projectId", label: "Project ID", type: "text", required: true },
      { key: "dataset", label: "Dataset", type: "text", defaultValue: "production", required: true },
      { key: "token", label: "API token", type: "password", required: true },
      { key: "documentType", label: "Document type", type: "text", defaultValue: "post", required: true },
      { key: "titleField", label: "Title field", type: "text", defaultValue: "title" },
      { key: "bodyField", label: "Body field", type: "text", defaultValue: "body" },
      { key: "slugField", label: "Slug field", type: "text", defaultValue: "slug" },
    ],
    buildPayload: (values) => ({
      projectId: trim(values, "projectId"),
      dataset: trim(values, "dataset") || "production",
      token: trim(values, "token"),
      documentType: trim(values, "documentType") || "post",
      fieldMapping: {
        titleField: trim(values, "titleField") || "title",
        bodyField: trim(values, "bodyField") || "body",
        slugField: trim(values, "slugField") || "slug",
      },
    }),
    canSubmit: (values) => has(values, "projectId") && has(values, "token"),
    connectedDetails: (integration) => [
      { label: "Project", value: String(integration.projectId ?? "") },
      { label: "Dataset", value: String(integration.dataset ?? "") },
    ],
    resetValues: () => ({
      projectId: "",
      dataset: "production",
      token: "",
      documentType: "post",
      titleField: "title",
      bodyField: "body",
      slugField: "slug",
    }),
  },
  strapi: {
    fields: [
      { key: "baseUrl", label: "Strapi URL", type: "url", required: true },
      { key: "apiToken", label: "API token", type: "password", required: true },
      { key: "contentType", label: "Content type", type: "text", defaultValue: "articles", required: true },
      {
        key: "publishStatus",
        label: "Publish mode",
        type: "select",
        defaultValue: "draft",
        options: [
          { value: "draft", label: "Draft" },
          { value: "live", label: "Live" },
        ],
      },
    ],
    buildPayload: (values) => ({
      baseUrl: trim(values, "baseUrl"),
      apiToken: trim(values, "apiToken"),
      contentType: trim(values, "contentType") || "articles",
      publishStatus: (trim(values, "publishStatus") || "draft") as "draft" | "live",
    }),
    canSubmit: (values) => has(values, "baseUrl") && has(values, "apiToken"),
    connectedDetails: (integration) => [
      { label: "URL", value: String(integration.baseUrl ?? "") },
    ],
    resetValues: () => ({ baseUrl: "", apiToken: "", contentType: "articles", publishStatus: "draft" }),
  },
  hubspot: {
    fields: [
      { key: "accessToken", label: "Private app token", type: "password", required: true },
      { key: "blogId", label: "Blog ID", type: "text", required: true },
      {
        key: "publishStatus",
        label: "Publish mode",
        type: "select",
        defaultValue: "draft",
        options: [
          { value: "draft", label: "Draft" },
          { value: "live", label: "Live" },
        ],
      },
    ],
    buildPayload: (values) => ({
      accessToken: trim(values, "accessToken"),
      blogId: trim(values, "blogId"),
      publishStatus: (trim(values, "publishStatus") || "draft") as "draft" | "live",
    }),
    canSubmit: (values) => has(values, "accessToken") && has(values, "blogId"),
    connectedDetails: (integration) => [
      { label: "Blog ID", value: String(integration.blogId ?? "") },
    ],
    resetValues: () => ({ accessToken: "", blogId: "", publishStatus: "draft" }),
  },
  typo3: {
    fields: [
      { key: "siteUrl", label: "TYPO3 site URL", type: "url", placeholder: "https://yoursite.com", required: true },
      {
        key: "siteKey",
        label: "Site key",
        type: "password",
        required: true,
        hint: "Install the goals.ac TYPO3 extension and copy the site key from Extension Manager settings.",
      },
      buildOutputModeField("typo3"),
    ],
    buildPayload: (values) => ({
      connectionType: "plugin" as const,
      siteUrl: trim(values, "siteUrl"),
      siteKey: trim(values, "siteKey"),
      ...appendOutputMode(values, "typo3"),
    }),
    canSubmit: (values) => has(values, "siteUrl") && has(values, "siteKey"),
    connectedDetails: (integration) => {
      const rows: ConnectedDetailRow[] = [
        { label: "Site URL", value: String(integration.siteUrl ?? "") },
      ];
      const outputRow = outputModeDetailRow("typo3", integration);
      if (outputRow) rows.push(outputRow);
      return rows;
    },
    resetValues: () => ({ siteUrl: "", siteKey: "" }),
  },
  beehiiv: {
    fields: [
      { key: "apiKey", label: "API key", type: "password", required: true },
      { key: "publicationId", label: "Publication ID", type: "text", required: true },
    ],
    buildPayload: (values) => ({
      apiKey: trim(values, "apiKey"),
      publicationId: trim(values, "publicationId"),
    }),
    canSubmit: (values) => has(values, "apiKey") && has(values, "publicationId"),
    connectedDetails: (integration) => [
      { label: "Publication", value: String(integration.publicationId ?? "") },
    ],
    resetValues: () => ({ apiKey: "", publicationId: "" }),
  },
  convertkit: {
    fields: [
      { key: "apiSecret", label: "API secret", type: "password", required: true },
      { key: "formId", label: "Form ID (optional)", type: "text" },
    ],
    buildPayload: (values) => ({
      apiSecret: trim(values, "apiSecret"),
      formId: trim(values, "formId") || undefined,
    }),
    canSubmit: (values) => has(values, "apiSecret"),
    connectedDetails: () => [{ label: "Status", value: "Connected" }],
    resetValues: () => ({ apiSecret: "", formId: "" }),
  },
  mailchimp: {
    fields: [
      { key: "apiKey", label: "API key", type: "password", required: true },
      { key: "serverPrefix", label: "Server prefix", type: "text", placeholder: "us1", required: true },
      { key: "listId", label: "Audience list ID", type: "text", required: true },
    ],
    buildPayload: (values) => ({
      apiKey: trim(values, "apiKey"),
      serverPrefix: trim(values, "serverPrefix"),
      listId: trim(values, "listId"),
    }),
    canSubmit: (values) => has(values, "apiKey") && has(values, "serverPrefix") && has(values, "listId"),
    connectedDetails: (integration) => [
      { label: "List ID", value: String(integration.listId ?? "") },
    ],
    resetValues: () => ({ apiKey: "", serverPrefix: "", listId: "" }),
  },
};

export function getCmsConnectionSchema(
  id: PublishDestinationId,
): CmsConnectionSchema | undefined {
  return CMS_CONNECTION_SCHEMAS[id];
}

export function getInitialFormValues(id: PublishDestinationId): Record<string, string> {
  const schema = getCmsConnectionSchema(id);
  if (!schema) return {};
  const values = schema.resetValues();
  for (const field of schema.fields) {
    if (field.defaultValue !== undefined && !values[field.key]) {
      values[field.key] = field.defaultValue;
    }
  }
  return values;
}

export function fieldIsVisible(
  field: ConnectionFieldDef,
  connectionMethod: ConnectionMethod,
  values: Record<string, string>,
): boolean {
  if (!field.when) return true;
  if (
    field.when.connectionMethod &&
    !field.when.connectionMethod.includes(connectionMethod)
  ) {
    return false;
  }
  if (field.when.authType) {
    const authType = values.authType || "basic";
    if (!field.when.authType.includes(authType)) return false;
  }
  return true;
}
