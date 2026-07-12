import type { ConnectionMethod, PublishDestinationId } from "./publishing-destinations";

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
    ],
    buildPayload: (values) => ({
      apiToken: trim(values, "apiToken"),
      collectionId: trim(values, "collectionId"),
      bodyFieldSlug: trim(values, "bodyFieldSlug") || "post-body",
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
    ],
    buildPayload: (values, connectionMethod) =>
      connectionMethod === "plugin"
        ? {
            connectionType: "plugin" as const,
            siteUrl: trim(values, "siteUrl"),
            siteKey: trim(values, "siteKey"),
          }
        : {
            connectionType: "api" as const,
            siteUrl: trim(values, "siteUrl"),
            username: trim(values, "username"),
            appPassword: trim(values, "appPassword"),
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
    ],
    buildPayload: (values) => ({
      apiUrl: trim(values, "apiUrl"),
      adminApiKey: trim(values, "adminApiKey"),
    }),
    canSubmit: (values) => has(values, "apiUrl") && has(values, "adminApiKey"),
    connectedDetails: (integration) => [
      { label: "API URL", value: String(integration.apiUrl ?? "") },
    ],
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
    ],
    buildPayload: (values) => ({
      url: trim(values, "url"),
      signingSecret: trim(values, "signingSecret"),
    }),
    canSubmit: (values) => has(values, "url") && has(values, "signingSecret"),
    connectedDetails: (integration) => [
      { label: "URL", value: String(integration.url ?? "") },
    ],
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
      return blogId ? { ...base, blogId } : base;
    },
    canSubmit: (values, connectionMethod) => {
      if (connectionMethod === "plugin") {
        return has(values, "siteUrl") && has(values, "siteKey");
      }
      return has(values, "shopDomain") && has(values, "accessToken");
    },
    connectedDetails: (integration) => [
      {
        label: "Method",
        value: integration.connectionType === "plugin" ? "goals.ac plugin" : "Admin API",
      },
      {
        label: "Site",
        value: String(integration.siteUrl ?? integration.shopDomain ?? ""),
      },
    ],
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
    ],
    buildPayload: (values, connectionMethod) => {
      if (connectionMethod === "plugin") {
        return {
          connectionType: "plugin" as const,
          siteUrl: trim(values, "siteUrl"),
          siteKey: trim(values, "siteKey"),
        };
      }
      const authType = (trim(values, "authType") || "basic") as "basic" | "bearer";
      const payload: Record<string, unknown> = {
        connectionType: "api" as const,
        siteUrl: trim(values, "siteUrl"),
        authType,
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
    connectedDetails: (integration) => [
      {
        label: "Method",
        value: integration.connectionType === "plugin" ? "goals.ac plugin" : "JSON:API",
      },
      { label: "Site", value: String(integration.siteUrl ?? "") },
    ],
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
    ],
    buildPayload: (values, connectionMethod) => {
      if (connectionMethod === "plugin") {
        return {
          connectionType: "plugin" as const,
          siteUrl: trim(values, "siteUrl"),
          siteKey: trim(values, "siteKey"),
        };
      }
      const payload: Record<string, unknown> = {
        connectionType: "api" as const,
        siteUrl: trim(values, "siteUrl"),
        apiToken: trim(values, "apiToken"),
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
    connectedDetails: (integration) => [
      {
        label: "Method",
        value: integration.connectionType === "plugin" ? "goals.ac plugin" : "Web Services API",
      },
      { label: "Site", value: String(integration.siteUrl ?? "") },
    ],
    resetValues: () => ({
      siteUrl: "",
      siteKey: "",
      apiToken: "",
      categoryId: "",
    }),
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
