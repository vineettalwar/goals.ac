export {
  AppSidebarShell,
  type AppShellLinkProps,
  type AppSidebarShellProps,
} from "./AppSidebarShell";
export { APP_SHELL_MAIN_OFFSET } from "./shell-constants";
export { cn } from "./cn";
export {
  buildNavModel,
  DEFAULT_PRODUCT_SURFACE,
  FOOTER_ITEMS,
  NAV_SECTIONS,
  type NavItemDef,
  type ProductSurface,
} from "./nav-config";
export { isNavItemActive, projectIdFromPathname, resolveNavHref } from "./nav-routing";
export { isSiteAdmin, isSuperAdmin, showPartnerNav } from "./nav-roles";
export * from "./dashboard";
export * from "./projects";
export * from "./settings";
export * from "./project-detail";
export * from "./studio";
// integrations owns destination SSOT names (getEsp/SocialDestinations,
// countEsp/SocialConnections, ConnectionMethod). content-piece still
// exports publish-overlay variants via `@workspace/app-shell/content-piece`.
export {
  ContentPieceNotFound,
  ContentPieceView,
  type ContentPieceLinkProps,
  type ContentPieceSavePayload,
  ContentBriefPanel,
  normalizeBriefOutline,
  type ContentBriefPanelProps,
  type ContentBriefSerpTopic,
  type ContentBriefSummary,
  ContentPiecePublishDialog,
  type RenderPreviewResult,
  ShopifyThemeSnippetPreflight,
  shopifyOutputModeNeedsThemeSnippet,
  readShopifyThemeSnippetRequiredFor,
  SHOPIFY_THEME_SNIPPET_REQUIRED_FALLBACK,
  ContentExportPanel,
  type ContentExportPlatform,
  ContentPieceRepurposeDialog,
  ContentPieceFeaturedImage,
  countCmsConnections,
  countPublishingConnections,
  getCmsDestinations,
  getConnectedDestinationsForFormat,
  getConnectionMethodLabel,
  getConnectionSummary,
  getDefaultConnectionMethod,
  getDestination,
  getDestinationsForFormat,
  getExportDestinations,
  getPublishCapabilityLabel,
  getPublishEndpoint,
  hasAnyPublishingConnection,
  impliedDestinationForFormat,
  isDestinationConnectedInSummary,
  PUBLISHING_DESTINATIONS,
  resolveSuggestedDestination,
  SOCIAL_SETTINGS_COUNT,
  supportsMultipleConnectionMethods,
  type CmsConnectionSnapshot,
  type CmsSummary,
  type ContentFormatType,
  type PublishDestinationDefinition,
  type PublishDestinationId,
  QUEUE_SOCIAL_INSTAGRAM_SKIPPED_MESSAGE,
  QUEUE_SOCIAL_PLATFORMS,
  formatEnhanceFailureMessage,
  formatEnhanceSuccessMessage,
  formatHumanizeResultMessage,
  formatQueueSocialSuccessMessage,
  humanizeAuditFromResponse,
  isMetaCmsConnected,
  queueSocialComposerPayload,
  queueSocialInstagramSkipped,
  selectQueueSocialPlatforms,
  socialComposerPath,
  socialHubQueuePath,
  type HumanizeActionResult,
  type HumanizeAuditSnapshot,
  type QueueSocialComposerOptions,
  type QueueSocialPlatform,
  contentPieceCanDelete,
  contentPieceCanEdit,
  contentPieceCanEnhance,
  contentPieceCanGenerate,
  contentPieceCanHumanize,
  contentPieceCanMarkReady,
  contentPieceCanPublish,
  contentPieceCanQueueSocial,
  contentPieceSupportsStockImages,
  contentStudioBackHref,
  formatContentFormatType,
  formatContentPieceUpdatedAt,
  formatHumanizationAuditLine,
  type ContentPieceDetail,
  type ContentPieceGeneratingState,
  type ContentPieceImageRef,
  type ContentPieceMetadata,
  type ContentPiecePublishingState,
  sanitizePreviewHtml,
} from "./content-piece";
export * from "./integrations";
export * from "./auth";
export * from "./audit";
export * from "./autopilot";
export * from "./help";
export * from "./growth-roadmap";
export * from "./social";
export * from "./section-panels";
export * from "./section";
export type { BrandProfileSummary, BrandScanDiscoveryMeta, LegacyItem } from "./studio";
