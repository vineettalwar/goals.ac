import "server-only";

import { hasPlatformLinkedInCredentials } from "@workspace/content-engine/support/social/linkedin-platform-credentials";
import { hasPlatformTwitterCredentials } from "@workspace/content-engine/support/social/twitter-platform-credentials";
import { hasPlatformMetaCredentials } from "@workspace/content-engine/support/social/meta-platform-credentials";
import { hasPlatformBlueskyCredentials } from "@workspace/content-engine/support/social/bluesky-platform-credentials";
import type { PlatformStatus } from "./platform-status";
import type { IntegrationEnvStatus } from "./platform-features";
import { hasPlatformBingWebmasterCredentials } from "@/lib/platform/bing-webmaster-credentials";
import { hasPlatformGoogleCredentials } from "@/lib/platform/google-oauth-credentials";
import { hasPlatformDataForSeoCredentials } from "@/lib/platform/dataforseo-credentials";
import {
  hasPexelsCredentials,
  hasResendCredentials,
  hasStripeCredentials,
  hasUnsplashCredentials,
} from "./platform-features";

/** Env or admin DB OAuth app credentials (via resolve*OAuthCredentials). */
export async function hasLinkedInCredentials(): Promise<boolean> {
  return hasPlatformLinkedInCredentials();
}

export async function hasTwitterCredentials(): Promise<boolean> {
  return hasPlatformTwitterCredentials();
}

export async function hasMetaCredentials(): Promise<boolean> {
  return hasPlatformMetaCredentials();
}

export async function hasBlueskyCredentials(): Promise<boolean> {
  return hasPlatformBlueskyCredentials();
}

export async function hasSocialCredentials(): Promise<boolean> {
  const [linkedin, twitter, meta, bluesky] = await Promise.all([
    hasLinkedInCredentials(),
    hasTwitterCredentials(),
    hasMetaCredentials(),
    hasBlueskyCredentials(),
  ]);
  return linkedin || twitter || meta || bluesky;
}

export async function getIntegrationEnvStatus(): Promise<IntegrationEnvStatus> {
  const [linkedin, twitter, meta, bluesky, bing, dataforseo, google] = await Promise.all([
    hasLinkedInCredentials(),
    hasTwitterCredentials(),
    hasMetaCredentials(),
    hasBlueskyCredentials(),
    hasPlatformBingWebmasterCredentials(),
    hasPlatformDataForSeoCredentials(),
    hasPlatformGoogleCredentials(),
  ]);
  return {
    google,
    bing,
    dataforseo,
    social: linkedin || twitter || meta || bluesky,
    linkedin,
    twitter,
    meta,
    bluesky,
    email: hasResendCredentials(),
    stripe: hasStripeCredentials(),
    unsplash: hasUnsplashCredentials(),
    pexels: hasPexelsCredentials(),
  };
}

export async function googleIntegrationsAvailable(settings: PlatformStatus): Promise<boolean> {
  return settings.googleIntegrationsEnabled && (await hasPlatformGoogleCredentials());
}

export async function bingWebmasterAvailable(settings: PlatformStatus): Promise<boolean> {
  if (!settings.bingWebmasterEnabled) return false;
  return hasPlatformBingWebmasterCredentials();
}

export async function socialPublishingAvailable(settings: PlatformStatus): Promise<boolean> {
  return settings.socialPublishingEnabled && (await hasSocialCredentials());
}
