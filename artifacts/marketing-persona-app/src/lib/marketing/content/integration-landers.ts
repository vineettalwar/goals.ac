export type { IntegrationLanderSlug, IntegrationLander } from "./integration-landers-types";
import type { IntegrationLanderSlug, IntegrationLander } from "./integration-landers-types";
import { CMS_LANDERS } from "./integration-landers-data-cms";
import { HEADLESS_LANDERS } from "./integration-landers-data-headless";
import { EMAIL_LANDERS } from "./integration-landers-data-email";
import { SOCIAL_LANDERS } from "./integration-landers-data-social";

const LANDERS: Record<IntegrationLanderSlug, IntegrationLander> = {
  ...CMS_LANDERS,
  ...HEADLESS_LANDERS,
  ...EMAIL_LANDERS,
  ...SOCIAL_LANDERS,
} as Record<IntegrationLanderSlug, IntegrationLander>;

export function getIntegrationLander(slug: string): IntegrationLander | undefined {
  return LANDERS[slug as IntegrationLanderSlug];
}

export function listIntegrationLanders(): IntegrationLander[] {
  return Object.values(LANDERS);
}

export function integrationLanderPath(slug: IntegrationLanderSlug): string {
  return `/integrations/${slug}`;
}

export function hasIntegrationLander(id: string): id is IntegrationLanderSlug {
  return id in LANDERS;
}
