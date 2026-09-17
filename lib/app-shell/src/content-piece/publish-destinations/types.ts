import type {
  CmsPlatformId,
  EspPlatformId,
  ExportDestinationId,
  SocialPublishId,
} from "../../integrations/destination-ids";

export type ContentFormatType =
  | "blog_post"
  | "news_article"
  | "tutorial"
  | "guide"
  | "whitepaper"
  | "pillar_page"
  | "location_page"
  | "infographic_outline"
  | "comparison"
  | "listicle"
  | "case_study"
  | "linkedin_post"
  | "twitter_thread"
  | "instagram_post"
  | "facebook_post"
  | "bluesky_post"
  | "mastodon_post"
  | "email_sequence"
  | "ad_copy"
  | "landing_page_copy"
  | "product_description"
  | "press_release"
  | "faq_article";

export type PublishDestinationId =
  | CmsPlatformId
  | EspPlatformId
  | ExportDestinationId
  | SocialPublishId;

export type ConnectionMethod = "api" | "plugin" | "oauth";

export type CmsConnectionSnapshot = Record<string, unknown>;

export interface PublishDestinationDefinition {
  id: PublishDestinationId;
  label: string;
  category: "cms" | "social" | "esp" | "export";
  integrationKey: string;
  description: string;
  badgeLetter?: string;
  badgeClassName?: string;
  listColorClassName?: string;
  connectionMethods: ConnectionMethod[];
  connectionMethodLabels: Partial<Record<ConnectionMethod, string>>;
  isConnected: (connections: CmsConnectionSnapshot) => boolean;
  matchesFormat: (format: ContentFormatType) => boolean;
  oauthPath?: string;
  hideSettingsCard?: boolean;
  exportOnly?: boolean;
  comingSoon?: boolean;
}

export type CmsSummary = Record<
  | CmsPlatformId
  | EspPlatformId
  | "linkedin"
  | "twitter"
  | "meta"
  | "bluesky"
  | "mastodon",
  boolean
>;
