// hubspot, typo3, beehiiv, convertkit, mailchimp
import {
  trim,
  has,
  buildOutputModeField,
  outputModeDetailRow,
  appendOutputMode,
  type PartialSchemas,
} from "./cms-schema-helpers";

export const EMAIL_SCHEMAS: PartialSchemas = {
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
      const rows = [{ label: "Site URL", value: String(integration.siteUrl ?? "") }];
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
