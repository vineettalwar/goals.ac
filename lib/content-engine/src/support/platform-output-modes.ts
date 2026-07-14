import type { AdapterPlatformId } from "../adapters/types";
import type { PublishEntitlements } from "./publish-entitlements";
import type { CmsIntegrationCredentials } from "./cms-integrations";

export interface PlatformOutputModeOption {
  value: string;
  label: string;
  hint?: string;
  requiresEntitlement?: "byok" | "growth";
}

export const PLATFORM_OUTPUT_MODES: Partial<Record<AdapterPlatformId, PlatformOutputModeOption[]>> = {
  wordpress: [
    { value: "classic", label: "Classic HTML (default)" },
    { value: "gutenberg", label: "Gutenberg blocks" },
    {
      value: "elementor",
      label: "Elementor",
      hint: "Requires Elementor on your WordPress site.",
      requiresEntitlement: "byok",
    },
    {
      value: "divi",
      label: "Divi shortcodes",
      hint: "Requires Divi theme/builder.",
      requiresEntitlement: "byok",
    },
  ],
  ghost: [
    { value: "html", label: "HTML (default)" },
    {
      value: "lexical",
      label: "Lexical / Koenig cards",
      hint: "Native Ghost 5 editor cards via Admin API.",
      requiresEntitlement: "byok",
    },
  ],
  drupal: [
    { value: "body_html", label: "Body HTML (default)" },
    {
      value: "layout_builder",
      label: "Layout Builder sections",
      hint: "Requires Layout Builder on the target content type.",
      requiresEntitlement: "byok",
    },
  ],
  typo3: [
    { value: "body_text", label: "Single text element (default)" },
    {
      value: "content_elements",
      label: "Content elements",
      hint: "Maps markdown to multiple TYPO3 content elements.",
      requiresEntitlement: "byok",
    },
  ],
  shopify: [
    { value: "article_html", label: "Blog article HTML (default)" },
    {
      value: "article_metafields",
      label: "Article + section metafields",
      hint: "Stores structured sections as article metafield JSON.",
      requiresEntitlement: "byok",
    },
    {
      value: "page_sections",
      label: "OS 2.0 page sections",
      hint: "Creates a landing page with theme sections.",
      requiresEntitlement: "byok",
    },
  ],
  joomla: [
    { value: "markdown", label: "Markdown (plugin converts)" },
    { value: "html", label: "Pre-rendered HTML" },
  ],
  webhook: [
    { value: "both", label: "Markdown + HTML (default)" },
    { value: "markdown", label: "Markdown only" },
    { value: "html", label: "HTML only" },
    {
      value: "full",
      label: "Full payload (canonical JSON)",
      requiresEntitlement: "byok",
    },
  ],
};

/** Fixed-format platforms — display only, no selector. */
export const FIXED_OUTPUT_MODE_LABELS: Partial<Record<AdapterPlatformId, string>> = {
  notion: "Notion blocks",
  webflow: "HTML (Rich Text field)",
  wix: "HTML",
  framer: "HTML",
  squarespace: "HTML",
  hubspot: "HTML",
  contentful: "HTML (mapped fields)",
  sanity: "HTML (mapped fields)",
  strapi: "HTML (mapped fields)",
};

const PLATFORM_DEFAULTS: Partial<Record<AdapterPlatformId, string>> = {
  wordpress: "classic",
  ghost: "html",
  drupal: "body_html",
  typo3: "body_text",
  shopify: "article_html",
  joomla: "markdown",
  webhook: "both",
};

function credsOutputMode(
  platform: string,
  creds?: CmsIntegrationCredentials,
): string | undefined {
  if (!creds) return undefined;
  switch (platform) {
    case "wordpress":
      return creds.wordpress?.outputMode ?? creds.wordpress?.editorMode;
    case "ghost":
      return creds.ghost?.outputMode;
    case "drupal":
      return creds.drupal?.outputMode;
    case "typo3":
      return creds.typo3?.outputMode;
    case "shopify":
      return creds.shopify?.outputMode;
    case "joomla":
      return creds.joomla?.outputMode;
    case "webhook":
      return creds.webhook?.outputMode;
    default:
      return undefined;
  }
}

export function getOutputModes(platform: string): PlatformOutputModeOption[] {
  return PLATFORM_OUTPUT_MODES[platform as AdapterPlatformId] ?? [];
}

export function getDefaultOutputMode(platform: string): string {
  return PLATFORM_DEFAULTS[platform as AdapterPlatformId] ?? "html";
}

export function getFixedOutputModeLabel(platform: string): string | undefined {
  return FIXED_OUTPUT_MODE_LABELS[platform as AdapterPlatformId];
}

export function isOutputModeAllowed(
  mode: string,
  platform: string,
  entitlements: PublishEntitlements,
): boolean {
  const options = getOutputModes(platform);
  const option = options.find((o) => o.value === mode);
  if (!option) return false;
  if (!option.requiresEntitlement) return true;
  const enhanced =
    entitlements.hasByok ||
    entitlements.plan === "growth" ||
    entitlements.plan === "scale";
  return enhanced;
}

export function assertOutputModeAllowed(
  mode: string,
  platform: string,
  entitlements: PublishEntitlements,
): string {
  if (isOutputModeAllowed(mode, platform, entitlements)) return mode;
  return getDefaultOutputMode(platform);
}

export function resolveOutputMode(input: {
  platform: string;
  explicit?: string | null;
  creds?: CmsIntegrationCredentials;
  pieceIntended?: string | null;
  entitlements?: PublishEntitlements;
}): string {
  const { platform, explicit, creds, pieceIntended, entitlements } = input;
  const fallback = getDefaultOutputMode(platform);
  const raw =
    explicit?.trim() ||
    credsOutputMode(platform, creds) ||
    pieceIntended?.trim() ||
    fallback;
  if (entitlements) {
    return assertOutputModeAllowed(raw, platform, entitlements);
  }
  return raw;
}

export function outputModeLabel(platform: string, mode: string): string {
  const options = getOutputModes(platform);
  return options.find((o) => o.value === mode)?.label ?? mode;
}
