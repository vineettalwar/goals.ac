import {
  SOCIAL_PUBLISH_IDS,
  type SocialPublishId,
} from "../../integrations/destination-ids";
import { getSocialDestinations as getShellSocialDestinations } from "../../integrations/publishing-destinations";
import type { PublishDestinationDefinition } from "./types";
import {
  SOCIAL_FORMAT_DESTINATION,
  hasMeta,
} from "./helpers";

const SOCIAL_LIST_COLORS: Record<SocialPublishId, string> = {
  linkedin: "bg-blue-500",
  twitter: "bg-sky-400",
  instagram: "bg-fuchsia-500",
  facebook: "bg-indigo-500",
  bluesky: "bg-sky-500",
  mastodon: "bg-violet-500",
};

const SOCIAL_OAUTH_LABEL: Partial<Record<string, string>> = {
  linkedin: "OAuth",
  twitter: "OAuth",
  bluesky: "AT Protocol OAuth",
  mastodon: "Instance OAuth",
  meta: "Meta OAuth",
};

export function buildSocialDestinations(): PublishDestinationDefinition[] {
  const fromShell: PublishDestinationDefinition[] = [];

  for (const shell of getShellSocialDestinations()) {
    if (shell.id === "meta") {
      for (const id of ["instagram", "facebook"] as const) {
        fromShell.push({
          id,
          label: id === "instagram" ? "Instagram" : "Facebook",
          category: "social",
          integrationKey: "meta",
          description:
            id === "instagram"
              ? "Publish Instagram posts via a connected Meta account."
              : "Publish Facebook posts via a connected Meta account.",
          listColorClassName: SOCIAL_LIST_COLORS[id],
          connectionMethods: ["oauth"],
          connectionMethodLabels: { oauth: SOCIAL_OAUTH_LABEL.meta ?? "Meta OAuth" },
          hideSettingsCard: true,
          isConnected: hasMeta,
          matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === id,
        });
      }
      continue;
    }

    const id = shell.id as SocialPublishId;
    fromShell.push({
      id,
      label: shell.label,
      category: "social",
      integrationKey: shell.integrationKey,
      description: shell.description,
      listColorClassName: SOCIAL_LIST_COLORS[id],
      connectionMethods: ["oauth"],
      connectionMethodLabels: {
        oauth: SOCIAL_OAUTH_LABEL[shell.id] ?? "OAuth",
      },
      oauthPath: shell.oauthPath,
      hideSettingsCard: id === "bluesky" || id === "mastodon" ? true : undefined,
      isConnected: (c) => !!c[shell.integrationKey],
      matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === id,
    });
  }

  const covered = new Set(fromShell.map((d) => d.id));
  for (const id of SOCIAL_PUBLISH_IDS) {
    if (!covered.has(id)) {
      throw new Error(`Shell social destinations missing publish id: ${id}`);
    }
  }
  return fromShell;
}
