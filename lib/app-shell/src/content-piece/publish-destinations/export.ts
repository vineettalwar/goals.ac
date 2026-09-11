import { EXPORT_DESTINATION_IDS } from "../../integrations/destination-ids";
import type {
  ContentFormatType,
  ConnectionMethod,
  PublishDestinationDefinition,
} from "./types";
import { matchesEmail, matchesLongForm } from "./helpers";

export function buildExportDestinations(): PublishDestinationDefinition[] {
  return EXPORT_DESTINATION_IDS.map((id) => {
    if (id === "medium") {
      return {
        id,
        label: "Medium",
        category: "export" as const,
        integrationKey: "medium",
        description: "Medium's API is deprecated. Export markdown and paste into Medium.",
        badgeLetter: "M",
        badgeClassName: "bg-neutral-700",
        listColorClassName: "bg-neutral-500",
        connectionMethods: ["api"] as ConnectionMethod[],
        connectionMethodLabels: { api: "Export only" },
        isConnected: () => false,
        matchesFormat: matchesLongForm,
        exportOnly: true,
      };
    }
    return {
      id,
      label: "Substack",
      category: "export" as const,
      integrationKey: "substack",
      description: "No write API available. Export markdown and paste into Substack.",
      badgeLetter: "S",
      badgeClassName: "bg-orange-600",
      listColorClassName: "bg-orange-400",
      connectionMethods: ["api"] as ConnectionMethod[],
      connectionMethodLabels: { api: "Export only" },
      isConnected: () => false,
      matchesFormat: (f: ContentFormatType) => matchesEmail(f) || matchesLongForm(f),
      exportOnly: true,
    };
  });
}
