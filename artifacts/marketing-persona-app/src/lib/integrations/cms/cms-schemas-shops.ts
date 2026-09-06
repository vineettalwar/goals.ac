// shopify, wix, framer, squarespace
import {
  trim,
  has,
  buildOutputModeField,
  outputModeDetailRow,
  appendOutputMode,
  type PartialSchemas,
} from "./cms-schema-helpers";

export const SHOPS_SCHEMAS: PartialSchemas = {
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
      const rows = [
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
};
