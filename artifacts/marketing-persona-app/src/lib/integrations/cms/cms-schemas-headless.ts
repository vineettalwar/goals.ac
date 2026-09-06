// drupal, joomla, contentful, sanity, strapi
import {
  trim,
  has,
  buildOutputModeField,
  outputModeDetailRow,
  appendOutputMode,
  type PartialSchemas,
} from "./cms-schema-helpers";

export const HEADLESS_SCHEMAS: PartialSchemas = {
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
      const rows = [
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
      const rows = [
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
};
