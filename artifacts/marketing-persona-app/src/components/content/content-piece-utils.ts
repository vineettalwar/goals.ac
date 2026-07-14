import {
  type ContentFormatType,
  type PublishDestinationId,
  getConnectedDestinationsForFormat,
  getDestination,
  getDestinationsForFormat,
  type CmsConnectionSnapshot,
} from "@/lib/projects/publishing-destinations";

export function defaultPublishPlatform(
  formatType: string,
  connections: CmsConnectionSnapshot,
  pieceMetadata?: { intendedPublishPlatform?: string } | null,
): PublishDestinationId {
  const intended = pieceMetadata?.intendedPublishPlatform as PublishDestinationId | undefined;
  if (intended) {
    const def = getDestination(intended);
    if (def && !def.exportOnly && def.isConnected(connections)) return intended;
  }
  const connected = getConnectedDestinationsForFormat(formatType as ContentFormatType, connections);
  if (connected[0]) return connected[0].id;
  const fallback = getDestinationsForFormat(formatType as ContentFormatType).find(
    (d) => !d.exportOnly,
  );
  return fallback?.id ?? "wordpress";
}
