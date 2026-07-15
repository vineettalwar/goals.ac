/**
 * Thin re-export — canonical publish-destination registry lives in
 * `lib/app-shell/src/content-piece/publish-destinations.ts`.
 *
 * This file keeps `@/lib/projects/publishing-destinations` import paths stable
 * across Next components without duplicating definitions.
 */
export {
  countCmsConnections,
  countEspConnections,
  countPublishingConnections,
  countSocialConnections,
  getCmsDestinations,
  getConnectedDestinationsForFormat,
  getConnectionMethodLabel,
  getConnectionSummary,
  getDefaultConnectionMethod,
  getDestination,
  getDestinationsForFormat,
  getEspDestinations,
  getExportDestinations,
  getPublishCapabilityLabel,
  getPublishEndpoint,
  getSocialDestinations,
  hasAnyPublishingConnection,
  impliedDestinationForFormat,
  isDestinationConnectedInSummary,
  PUBLISHING_DESTINATIONS,
  resolveSuggestedDestination,
  SOCIAL_SETTINGS_COUNT,
  supportsMultipleConnectionMethods,
  type CmsConnectionSnapshot,
  type CmsSummary,
  type ConnectionMethod,
  type ContentFormatType,
  type PublishDestinationDefinition,
  type PublishDestinationId,
} from "@workspace/app-shell/publish-destinations";
