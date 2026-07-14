import type { PublishDestinationDefinition, PublishDestinationId } from "@/lib/projects/publishing-destinations";

type IntegrationDialogId = PublishDestinationId | "meta";

export function getIntegrationDialogTitle(
  activeDialog: IntegrationDialogId,
  destinations: PublishDestinationDefinition[],
): string {
  if (activeDialog === "meta") return "Facebook & Instagram";
  return destinations.find((d) => d.id === activeDialog)?.label ?? "Integration settings";
}
