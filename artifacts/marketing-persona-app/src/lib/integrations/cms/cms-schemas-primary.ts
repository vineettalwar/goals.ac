// notion, webflow, wordpress, ghost, webhook
import {
  trim,
  has,
  buildOutputModeField,
  outputModeDetailRow,
  appendOutputMode,
  type PartialSchemas,
} from "./cms-schema-helpers";

export const PRIMARY_SCHEMAS: PartialSchemas = {
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
      const rows = [
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
      const rows = [{ label: "API URL", value: String(integration.apiUrl ?? "") }];
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
      const rows = [{ label: "URL", value: String(integration.url ?? "") }];
      const outputRow = outputModeDetailRow("webhook", integration);
      if (outputRow) rows.push(outputRow);
      return rows;
    },
    resetValues: () => ({ url: "", signingSecret: "" }),
  },
};
