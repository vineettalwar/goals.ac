import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { lastFour } from "@workspace/billing";
import { stripeConnectOAuthAvailable } from "@/lib/platform/stripe-connect-oauth";
import { isLinkedInManagedByEnv } from "@workspace/content-engine/support/social/linkedin-platform-credentials";
import { isTwitterManagedByEnv } from "@workspace/content-engine/support/social/twitter-platform-credentials";
import { isMetaManagedByEnv } from "@workspace/content-engine/support/social/meta-platform-credentials";
import { isBlueskyManagedByEnv } from "@workspace/content-engine/support/social/bluesky-platform-credentials";
import { isBingManagedByEnv } from "@/lib/platform/bing-webmaster-credentials";
import { isGoogleManagedByEnv } from "@/lib/platform/google-oauth-credentials";
import { isDataForSeoManagedByEnv } from "@/lib/platform/dataforseo-credentials";
import { eq } from "drizzle-orm";
import { getPlatformBedrockStatus } from "@/lib/platform/platform-bedrock-admin";
import { getAllPlatformAiProviderStatuses } from "@/lib/platform/platform-ai-credentials";
import type { PlatformIntegrationStatus } from "@/lib/platform/platform-integration-types";
import {
  activeEnvVars,
  BLUESKY_ENV_VARS,
  BING_WEBMASTER_ENV_VARS,
  GOOGLE_ENV_VARS,
  DATAFORSEO_ENV_VARS,
  fieldStatus,
  isPexelsManagedByEnv,
  isResendManagedByEnv,
  isStripeManagedByEnv,
  isUnsplashManagedByEnv,
  LINKEDIN_ENV_VARS,
  META_ENV_VARS,
  PEXELS_ENV_VARS,
  plainFieldStatus,
  RESEND_ENV_VARS,
  safeDecrypt,
  STRIPE_ENV_VARS,
  TWITTER_ENV_VARS,
  UNSPLASH_ENV_VARS,
} from "./shared";

export async function getPlatformIntegrationStatus(): Promise<PlatformIntegrationStatus> {
  const [rows, bedrock, aiProviders] = await Promise.all([
    db
      .select({
        encryptedStripeSecretKey: platformSettingsTable.encryptedStripeSecretKey,
        encryptedStripeConnectAccessToken: platformSettingsTable.encryptedStripeConnectAccessToken,
        encryptedStripeWebhookSecret: platformSettingsTable.encryptedStripeWebhookSecret,
        stripePriceGrowthMonthly: platformSettingsTable.stripePriceGrowthMonthly,
        stripePriceScaleMonthly: platformSettingsTable.stripePriceScaleMonthly,
        stripeConnectAccountId: platformSettingsTable.stripeConnectAccountId,
        stripeConnectLivemode: platformSettingsTable.stripeConnectLivemode,
        stripeConnectConnectedAt: platformSettingsTable.stripeConnectConnectedAt,
        encryptedResendApiKey: platformSettingsTable.encryptedResendApiKey,
        resendFromEmail: platformSettingsTable.resendFromEmail,
        encryptedUnsplashAccessKey: platformSettingsTable.encryptedUnsplashAccessKey,
        encryptedPexelsApiKey: platformSettingsTable.encryptedPexelsApiKey,
        linkedinClientId: platformSettingsTable.linkedinClientId,
        encryptedLinkedinClientSecret: platformSettingsTable.encryptedLinkedinClientSecret,
        twitterClientId: platformSettingsTable.twitterClientId,
        encryptedTwitterClientSecret: platformSettingsTable.encryptedTwitterClientSecret,
        metaAppId: platformSettingsTable.metaAppId,
        encryptedMetaAppSecret: platformSettingsTable.encryptedMetaAppSecret,
        blueskyClientName: platformSettingsTable.blueskyClientName,
        encryptedBlueskyOauthPrivateKeyJwk:
          platformSettingsTable.encryptedBlueskyOauthPrivateKeyJwk,
        bingWebmasterClientId: platformSettingsTable.bingWebmasterClientId,
        encryptedBingWebmasterClientSecret:
          platformSettingsTable.encryptedBingWebmasterClientSecret,
        googleClientId: platformSettingsTable.googleClientId,
        encryptedGoogleClientSecret: platformSettingsTable.encryptedGoogleClientSecret,
        encryptedDataforseoLogin: platformSettingsTable.encryptedDataforseoLogin,
        encryptedDataforseoPassword: platformSettingsTable.encryptedDataforseoPassword,
      })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1))
      .limit(1),
    getPlatformBedrockStatus(),
    getAllPlatformAiProviderStatuses(),
  ]);
  const row = rows[0];

  const connectToken = safeDecrypt(row?.encryptedStripeConnectAccessToken);

  return {
    stripe: {
      managedByEnv: isStripeManagedByEnv(),
      envVars: activeEnvVars(STRIPE_ENV_VARS),
      connectAvailable: stripeConnectOAuthAvailable(),
      connect: {
        connected: Boolean(connectToken && row?.stripeConnectAccountId),
        accountId: row?.stripeConnectAccountId ?? null,
        livemode: row?.stripeConnectLivemode ?? null,
        connectedAt: row?.stripeConnectConnectedAt?.toISOString() ?? null,
        lastFour: lastFour(connectToken),
      },
      secretKey: fieldStatus(row?.encryptedStripeSecretKey, "STRIPE_SECRET_KEY"),
      webhookSecret: fieldStatus(row?.encryptedStripeWebhookSecret, "STRIPE_WEBHOOK_SECRET"),
      priceGrowthMonthly: plainFieldStatus(
        row?.stripePriceGrowthMonthly,
        "STRIPE_PRICE_GROWTH_MONTHLY",
      ),
      priceScaleMonthly: plainFieldStatus(row?.stripePriceScaleMonthly, "STRIPE_PRICE_SCALE_MONTHLY"),
    },
    resend: {
      managedByEnv: isResendManagedByEnv(),
      envVars: activeEnvVars(RESEND_ENV_VARS),
      apiKey: fieldStatus(row?.encryptedResendApiKey, "RESEND_API_KEY"),
      fromEmail: plainFieldStatus(row?.resendFromEmail, "RESEND_FROM_EMAIL"),
    },
    unsplash: {
      managedByEnv: isUnsplashManagedByEnv(),
      envVars: activeEnvVars(UNSPLASH_ENV_VARS),
      accessKey: fieldStatus(row?.encryptedUnsplashAccessKey, "UNSPLASH_ACCESS_KEY"),
    },
    pexels: {
      managedByEnv: isPexelsManagedByEnv(),
      envVars: activeEnvVars(PEXELS_ENV_VARS),
      apiKey: fieldStatus(row?.encryptedPexelsApiKey, "PEXELS_API_KEY"),
    },
    linkedin: {
      managedByEnv: isLinkedInManagedByEnv(),
      envVars: activeEnvVars(LINKEDIN_ENV_VARS),
      clientId: plainFieldStatus(row?.linkedinClientId, "LINKEDIN_CLIENT_ID"),
      clientSecret: fieldStatus(row?.encryptedLinkedinClientSecret, "LINKEDIN_CLIENT_SECRET"),
    },
    twitter: {
      managedByEnv: isTwitterManagedByEnv(),
      envVars: activeEnvVars(TWITTER_ENV_VARS),
      clientId: plainFieldStatus(row?.twitterClientId, "TWITTER_CLIENT_ID"),
      clientSecret: fieldStatus(row?.encryptedTwitterClientSecret, "TWITTER_CLIENT_SECRET"),
    },
    meta: {
      managedByEnv: isMetaManagedByEnv(),
      envVars: activeEnvVars(META_ENV_VARS),
      appId: plainFieldStatus(row?.metaAppId, "META_APP_ID"),
      appSecret: fieldStatus(row?.encryptedMetaAppSecret, "META_APP_SECRET"),
    },
    bluesky: {
      managedByEnv: isBlueskyManagedByEnv(),
      envVars: activeEnvVars(BLUESKY_ENV_VARS),
      clientName: plainFieldStatus(row?.blueskyClientName, "BLUESKY_CLIENT_NAME"),
      privateKeyJwk: fieldStatus(
        row?.encryptedBlueskyOauthPrivateKeyJwk,
        "BLUESKY_OAUTH_PRIVATE_KEY_JWK",
      ),
    },
    bing: {
      managedByEnv: isBingManagedByEnv(),
      envVars: activeEnvVars(BING_WEBMASTER_ENV_VARS),
      clientId: plainFieldStatus(row?.bingWebmasterClientId, "BING_WEBMASTER_CLIENT_ID"),
      clientSecret: fieldStatus(
        row?.encryptedBingWebmasterClientSecret,
        "BING_WEBMASTER_CLIENT_SECRET",
      ),
    },
    google: {
      managedByEnv: isGoogleManagedByEnv(),
      envVars: activeEnvVars(GOOGLE_ENV_VARS),
      clientId: plainFieldStatus(row?.googleClientId, "GOOGLE_CLIENT_ID"),
      clientSecret: fieldStatus(row?.encryptedGoogleClientSecret, "GOOGLE_CLIENT_SECRET"),
    },
    dataforseo: {
      managedByEnv: isDataForSeoManagedByEnv(),
      envVars: activeEnvVars(DATAFORSEO_ENV_VARS),
      login: fieldStatus(row?.encryptedDataforseoLogin, "DATAFORSEO_LOGIN"),
      password: fieldStatus(row?.encryptedDataforseoPassword, "DATAFORSEO_PASSWORD"),
    },
    gemini: aiProviders.gemini,
    openai: aiProviders.openai,
    anthropic: aiProviders.anthropic,
    openrouter: aiProviders.openrouter,
    groq: aiProviders.groq,
    nvidia: aiProviders.nvidia,
    ollama: aiProviders.ollama,
    bedrock,
  };
}
