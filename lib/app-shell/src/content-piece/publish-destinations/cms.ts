import type { CmsPlatformId } from "../../integrations/destination-ids";
import { CMS_PLATFORMS } from "../../integrations/types";
import type {
  ConnectionMethod,
  PublishDestinationDefinition,
} from "./types";
import { matchesLongForm } from "./helpers";

const CMS_NEXT_OVERLAY: Record<
  CmsPlatformId,
  {
    connectionMethods: ConnectionMethod[];
    connectionMethodLabels: Partial<Record<ConnectionMethod, string>>;
    listColorClassName: string;
  }
> = {
  wordpress: {
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Application Password (REST API)",
      plugin: "goals.ac plugin (HMAC)",
    },
    listColorClassName: "bg-blue-400",
  },
  notion: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Integration token" },
    listColorClassName: "bg-zinc-400",
  },
  webflow: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Site API token" },
    listColorClassName: "bg-purple-400",
  },
  ghost: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Admin API key" },
    listColorClassName: "bg-zinc-500",
  },
  shopify: {
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Shopify Admin API",
      plugin: "goals.ac plugin (HMAC)",
    },
    listColorClassName: "bg-green-500",
  },
  drupal: {
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Drupal JSON:API",
      plugin: "goals.ac plugin (HMAC)",
    },
    listColorClassName: "bg-sky-500",
  },
  joomla: {
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Joomla Web Services API",
      plugin: "goals.ac plugin (HMAC)",
    },
    listColorClassName: "bg-orange-500",
  },
  webhook: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Signed webhook URL" },
    listColorClassName: "bg-amber-400",
  },
  wix: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Access token" },
    listColorClassName: "bg-yellow-400",
  },
  framer: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Project API token" },
    listColorClassName: "bg-violet-400",
  },
  squarespace: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "API key" },
    listColorClassName: "bg-neutral-500",
  },
  contentful: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Personal access token" },
    listColorClassName: "bg-blue-300",
  },
  sanity: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Project token" },
    listColorClassName: "bg-red-400",
  },
  strapi: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "API token" },
    listColorClassName: "bg-indigo-400",
  },
  hubspot: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Private app token" },
    listColorClassName: "bg-orange-400",
  },
  typo3: {
    connectionMethods: ["plugin"],
    connectionMethodLabels: { plugin: "goals.ac plugin (HMAC)" },
    listColorClassName: "bg-orange-500",
  },
};

const CMS_DISPLAY_ORDER: CmsPlatformId[] = [
  "wordpress",
  "notion",
  "webflow",
  "ghost",
  "shopify",
  "drupal",
  "joomla",
  "webhook",
  "wix",
  "framer",
  "squarespace",
  "contentful",
  "sanity",
  "strapi",
  "hubspot",
  "typo3",
];

export function buildCmsDestinations(): PublishDestinationDefinition[] {
  const byKey = new Map(CMS_PLATFORMS.map((p) => [p.key, p]));
  const ordered: PublishDestinationDefinition[] = [];

  for (const id of CMS_DISPLAY_ORDER) {
    const platform = byKey.get(id);
    if (!platform) continue;
    byKey.delete(id);
    ordered.push(cmsDefFromPlatform(platform));
  }
  for (const platform of byKey.values()) {
    ordered.push(cmsDefFromPlatform(platform));
  }
  return ordered;
}

export function cmsDefFromPlatform(
  platform: (typeof CMS_PLATFORMS)[number],
): PublishDestinationDefinition {
  const overlay = CMS_NEXT_OVERLAY[platform.key] ?? {
    connectionMethods: ["api"] as ConnectionMethod[],
    connectionMethodLabels: { api: "API" },
    listColorClassName: "bg-zinc-400",
  };
  return {
    id: platform.key,
    label: platform.label,
    category: "cms",
    integrationKey: platform.key,
    description: platform.description,
    badgeLetter: platform.badgeLetter,
    badgeClassName: platform.badgeClassName,
    listColorClassName: overlay.listColorClassName,
    connectionMethods: overlay.connectionMethods,
    connectionMethodLabels: overlay.connectionMethodLabels,
    isConnected: (c) => !!c[platform.key],
    matchesFormat: matchesLongForm,
  };
}
