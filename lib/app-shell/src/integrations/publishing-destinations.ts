import type { CmsIntegrationRow } from "./types";

export type CmsConnectionSnapshot = Record<string, CmsIntegrationRow | undefined>;

export type SocialDestinationDefinition = {
  id: string;
  label: string;
  integrationKey: string;
  oauthPath: string;
  description: string;
  /** Bluesky OAuth requires a handle query param. */
  oauthHandleParam?: boolean;
  /** Mastodon OAuth requires an instance query param. */
  oauthInstanceParam?: boolean;
  isConnected: (connections: CmsConnectionSnapshot) => boolean;
  connectionSummary: (connections: CmsConnectionSnapshot) => string | null;
};

function rowConnected(connections: CmsConnectionSnapshot, key: string): boolean {
  return Boolean(connections[key]?.connected);
}

const SOCIAL_DESTINATIONS: SocialDestinationDefinition[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    integrationKey: "linkedin",
    oauthPath: "linkedin",
    description: "Publish LinkedIn posts from Content Studio.",
    isConnected: (c) => rowConnected(c, "linkedin"),
    connectionSummary: (c) => {
      const row = c.linkedin;
      if (!row?.connected) return null;
      const name = row.displayName;
      return typeof name === "string" && name.trim() ? name : "Connected account";
    },
  },
  {
    id: "twitter",
    label: "X",
    integrationKey: "twitter",
    oauthPath: "twitter",
    description: "Publish threads directly to X.",
    isConnected: (c) => rowConnected(c, "twitter"),
    connectionSummary: (c) => {
      const row = c.twitter;
      if (!row?.connected) return null;
      const screenName = row.screenName;
      return typeof screenName === "string" && screenName.trim()
        ? `@${screenName}`
        : "Connected account";
    },
  },
  {
    id: "meta",
    label: "Facebook & Instagram",
    integrationKey: "meta",
    oauthPath: "meta",
    description: "Publish via a Facebook Page and linked Instagram account.",
    isConnected: (c) => rowConnected(c, "meta"),
    connectionSummary: (c) => {
      const row = c.meta;
      if (!row?.connected) return null;
      const instagram = row.instagramUsername;
      if (typeof instagram === "string" && instagram.trim()) {
        return `@${instagram}`;
      }
      const pageName = row.pageName;
      return typeof pageName === "string" && pageName.trim() ? pageName : "Connected Meta account";
    },
  },
  {
    id: "bluesky",
    label: "Bluesky",
    integrationKey: "bluesky",
    oauthPath: "bluesky",
    description: "Publish posts to Bluesky via AT Protocol OAuth.",
    oauthHandleParam: true,
    isConnected: (c) => rowConnected(c, "bluesky"),
    connectionSummary: (c) => {
      const row = c.bluesky;
      if (!row?.connected) return null;
      const handle = row.handle;
      return typeof handle === "string" && handle.trim() ? `@${handle}` : "Connected account";
    },
  },
  {
    id: "mastodon",
    label: "Mastodon",
    integrationKey: "mastodon",
    oauthPath: "mastodon",
    description: "Publish toots to your Mastodon instance.",
    oauthInstanceParam: true,
    isConnected: (c) => rowConnected(c, "mastodon"),
    connectionSummary: (c) => {
      const row = c.mastodon;
      if (!row?.connected) return null;
      const username = row.username;
      if (typeof username === "string" && username.trim()) {
        const instanceUrl =
          typeof row.instanceUrl === "string" ? row.instanceUrl : "https://mastodon.social";
        try {
          return `@${username}@${new URL(instanceUrl).hostname}`;
        } catch {
          return `@${username}`;
        }
      }
      return "Connected account";
    },
  },
];

export function getSocialDestinations(): SocialDestinationDefinition[] {
  return SOCIAL_DESTINATIONS;
}

export function countSocialConnections(connections: CmsConnectionSnapshot): number {
  return getSocialDestinations().filter((destination) => destination.isConnected(connections))
    .length;
}

export type EspPlatformId = "beehiiv" | "convertkit" | "mailchimp";

export type ConnectionMethod = "api" | "oauth";

export type EspDestinationDefinition = {
  id: EspPlatformId;
  label: string;
  integrationKey: EspPlatformId;
  description: string;
  connectionMethods: ConnectionMethod[];
  connectionMethodLabel: string;
  /** When true, goals-app-ui shows a link to Integrations instead of a connect dialog. */
  fullAppOnly?: boolean;
  isConnected: (connections: CmsConnectionSnapshot) => boolean;
};

const ESP_DESTINATIONS: EspDestinationDefinition[] = [
  {
    id: "beehiiv",
    label: "Beehiiv",
    integrationKey: "beehiiv",
    description: "Publish email sequences and newsletters to Beehiiv.",
    connectionMethods: ["api"],
    connectionMethodLabel: "API key",
    isConnected: (connections) => rowConnected(connections, "beehiiv"),
  },
  {
    id: "convertkit",
    label: "ConvertKit",
    integrationKey: "convertkit",
    description: "Create email broadcasts in ConvertKit (Kit).",
    connectionMethods: ["api"],
    connectionMethodLabel: "API secret",
    isConnected: (connections) => rowConnected(connections, "convertkit"),
  },
  {
    id: "mailchimp",
    label: "Mailchimp",
    integrationKey: "mailchimp",
    description: "Create email campaign drafts in Mailchimp.",
    connectionMethods: ["api"],
    connectionMethodLabel: "API key",
    isConnected: (connections) => rowConnected(connections, "mailchimp"),
  },
];

export const ESP_NATIVE_CONNECT_PLATFORMS = new Set<EspPlatformId>(
  ESP_DESTINATIONS.filter((destination) => !destination.fullAppOnly).map(
    (destination) => destination.id,
  ),
);

export function getEspDestinations(): EspDestinationDefinition[] {
  return ESP_DESTINATIONS;
}

export function countEspConnections(connections: CmsConnectionSnapshot): number {
  return getEspDestinations().filter((destination) => destination.isConnected(connections)).length;
}

export function getEspConnectionDetail(
  platform: EspPlatformId,
  row: CmsIntegrationRow | undefined,
): string | null {
  if (!row?.connected) return null;

  switch (platform) {
    case "beehiiv": {
      const publicationId = row.publicationId;
      return typeof publicationId === "string" && publicationId
        ? `Publication ${publicationId}`
        : "Connected";
    }
    case "convertkit": {
      const formId = row.formId;
      return typeof formId === "string" && formId ? `Form ${formId}` : "Connected";
    }
    case "mailchimp": {
      const listId = row.listId;
      const serverPrefix = row.serverPrefix;
      if (typeof listId === "string" && listId) {
        const prefix =
          typeof serverPrefix === "string" && serverPrefix ? `${serverPrefix} · ` : "";
        return `${prefix}List ${listId}`;
      }
      return "Connected";
    }
    default:
      return "Connected";
  }
}

export { ESP_DESTINATIONS };
