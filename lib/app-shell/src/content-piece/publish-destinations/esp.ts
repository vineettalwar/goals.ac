import type { EspPlatformId } from "../../integrations/destination-ids";
import { ESP_DESTINATIONS } from "../../integrations/publishing-destinations";
import type {
  ConnectionMethod,
  PublishDestinationDefinition,
} from "./types";
import { matchesEmail } from "./helpers";

const ESP_LIST_COLORS: Record<EspPlatformId, string> = {
  beehiiv: "bg-yellow-500",
  convertkit: "bg-red-400",
  mailchimp: "bg-yellow-400",
};

export function buildEspDestinations(): PublishDestinationDefinition[] {
  return ESP_DESTINATIONS.map((esp) => ({
    id: esp.id,
    label: esp.label,
    category: "esp" as const,
    integrationKey: esp.integrationKey,
    description: esp.description,
    badgeLetter: esp.badgeLetter,
    badgeClassName: esp.badgeClassName,
    listColorClassName: ESP_LIST_COLORS[esp.id],
    connectionMethods: [...esp.connectionMethods] as ConnectionMethod[],
    connectionMethodLabels: { api: esp.connectionMethodLabel },
    isConnected: (c) => !!c[esp.id],
    matchesFormat: matchesEmail,
  }));
}
