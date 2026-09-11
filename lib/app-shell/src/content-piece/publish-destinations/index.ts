/**
 * Canonical publish-destination registry — SSOT for app-shell + Next + legacy Vite.
 *
 * Composes CMS / ESP / social display metadata from `../../integrations/`
 * (CMS_PLATFORMS, ESP_DESTINATIONS, getSocialDestinations, destination-ids).
 * Overlays: format matching, connection-method settings, list colors,
 * publish endpoint paths, connection summaries.
 *
 * Consumers:
 *   shell  — CreateContentDialog, PublishDialog, content-piece UI
 *   Next   — re-exports from `@workspace/app-shell/content-piece`
 *   legacy — `artifacts/goals-ac/src/lib/publishing-destinations.ts`
 */

export type {
  ContentFormatType,
  PublishDestinationId,
  ConnectionMethod,
  CmsConnectionSnapshot,
  PublishDestinationDefinition,
  CmsSummary,
} from "./types";

export {
  impliedDestinationForFormat,
  PUBLISHING_DESTINATIONS,
  getDestination,
  getCmsDestinations,
  getEspDestinations,
  getExportDestinations,
  getSocialDestinations,
  getDestinationsForFormat,
  getConnectedDestinationsForFormat,
  resolveSuggestedDestination,
  countPublishingConnections,
  countCmsConnections,
  countEspConnections,
  SOCIAL_SETTINGS_COUNT,
  countSocialConnections,
  hasAnyPublishingConnection,
  supportsMultipleConnectionMethods,
  getDefaultConnectionMethod,
  getConnectionMethodLabel,
  isDestinationConnectedInSummary,
  getPublishEndpoint,
  getPublishCapabilityLabel,
  getConnectionSummary,
} from "./helpers";
