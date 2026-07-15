import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import {
  decryptCmsCredentials,
  resolveWordPressConnectionType,
  type CmsIntegrationCredentials,
} from "./cms-integrations";

export type PlatformHealthStatus = {
  platform: string;
  connected: boolean;
  ok: boolean | null;
  error?: string;
  siteName?: string;
  lastCheckedAt: string;
};

async function testPlatform(
  key: string,
  creds: CmsIntegrationCredentials,
): Promise<{ ok: boolean; error?: string; siteName?: string } | null> {
  switch (key) {
    case "notion": {
      if (!creds.notion) return null;
      const res = await fetch(`https://api.notion.com/v1/databases/${creds.notion.databaseId}`, {
        headers: {
          Authorization: `Bearer ${creds.notion.integrationToken}`,
          "Notion-Version": "2022-06-28",
        },
      });
      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, error: "Invalid integration token" };
      if (res.status === 404) return { ok: false, error: "Database not found or not shared" };
      return { ok: false, error: `Notion API ${res.status}` };
    }
    case "webflow": {
      if (!creds.webflow) return null;
      const { testWebflowConnection } = await import("@workspace/connectors/webflow");
      const result = await testWebflowConnection(creds.webflow.apiToken, creds.webflow.collectionId);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "ghost": {
      if (!creds.ghost) return null;
      const { testGhostConnection } = await import("@workspace/connectors/ghost");
      const result = await testGhostConnection(creds.ghost);
      return result.ok
        ? { ok: true, siteName: result.siteTitle }
        : { ok: false, error: result.error };
    }
    case "webhook": {
      if (!creds.webhook) return null;
      const { testWebhookConnection } = await import("@workspace/connectors/webhook");
      const result = await testWebhookConnection(creds.webhook);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "wordpress": {
      if (!creds.wordpress) return null;
      if (resolveWordPressConnectionType(creds.wordpress) === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.wordpress.siteUrl,
          siteKey: creds.wordpress.siteKey!,
          platform: "wordpress",
        });
        return result.ok
          ? { ok: true, siteName: result.health?.version }
          : { ok: false, error: result.error };
      }
      const { testWordPressConnection } = await import("@workspace/connectors/wordpress");
      const result = await testWordPressConnection({
        siteUrl: creds.wordpress.siteUrl,
        username: creds.wordpress.username ?? "",
        appPassword: creds.wordpress.appPassword ?? "",
      });
      return result.ok
        ? { ok: true, siteName: result.siteName }
        : { ok: false, error: result.error };
    }
    case "shopify": {
      if (!creds.shopify) return null;
      if (creds.shopify.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.shopify.siteUrl!,
          siteKey: creds.shopify.siteKey!,
          platform: "shopify",
        });
        return result.ok
          ? { ok: true, siteName: result.health?.version }
          : { ok: false, error: result.error };
      }
      const { testShopifyConnection } = await import("@workspace/connectors/shopify");
      const result = await testShopifyConnection({
        shopDomain: creds.shopify.shopDomain!,
        accessToken: creds.shopify.accessToken!,
        blogId: creds.shopify.blogId,
      });
      return result.ok
        ? { ok: true, siteName: result.shopName }
        : { ok: false, error: result.error };
    }
    case "drupal": {
      if (!creds.drupal) return null;
      if (creds.drupal.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.drupal.siteUrl,
          siteKey: creds.drupal.siteKey!,
          platform: "drupal",
        });
        return result.ok
          ? { ok: true, siteName: result.health?.version }
          : { ok: false, error: result.error };
      }
      const { testDrupalConnection } = await import("@workspace/connectors/drupal");
      const result = await testDrupalConnection({
        siteUrl: creds.drupal.siteUrl,
        authType: creds.drupal.authType ?? "basic",
        username: creds.drupal.username,
        password: creds.drupal.password,
        accessToken: creds.drupal.accessToken,
      });
      return result.ok
        ? { ok: true, siteName: result.siteName }
        : { ok: false, error: result.error };
    }
    case "joomla": {
      if (!creds.joomla) return null;
      if (creds.joomla.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.joomla.siteUrl,
          siteKey: creds.joomla.siteKey!,
          platform: "joomla",
        });
        return result.ok
          ? { ok: true, siteName: result.health?.version }
          : { ok: false, error: result.error };
      }
      const { testJoomlaConnection } = await import("@workspace/connectors/joomla");
      const result = await testJoomlaConnection({
        siteUrl: creds.joomla.siteUrl,
        apiToken: creds.joomla.apiToken!,
      });
      return result.ok
        ? { ok: true, siteName: result.siteName }
        : { ok: false, error: result.error };
    }
    case "wix": {
      if (!creds.wix) return null;
      const { testWixConnection } = await import("@workspace/connectors/wix");
      const result = await testWixConnection(creds.wix);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "framer": {
      if (!creds.framer) return null;
      const { testFramerConnection } = await import("@workspace/connectors/framer");
      const result = await testFramerConnection(creds.framer);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "squarespace": {
      if (!creds.squarespace) return null;
      const { testSquarespaceConnection } = await import("@workspace/connectors/squarespace");
      const result = await testSquarespaceConnection(creds.squarespace);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "contentful": {
      if (!creds.contentful) return null;
      const { testContentfulConnection } = await import("@workspace/connectors/contentful");
      const result = await testContentfulConnection(creds.contentful);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "sanity": {
      if (!creds.sanity) return null;
      const { testSanityConnection } = await import("@workspace/connectors/sanity");
      const result = await testSanityConnection(creds.sanity);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "strapi": {
      if (!creds.strapi) return null;
      const { testStrapiConnection } = await import("@workspace/connectors/strapi");
      const result = await testStrapiConnection(creds.strapi);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "hubspot": {
      if (!creds.hubspot) return null;
      const { testHubSpotConnection } = await import("@workspace/connectors/hubspot");
      const result = await testHubSpotConnection(creds.hubspot);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "typo3": {
      if (!creds.typo3) return null;
      const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
      const result = await testGoalsAcPluginConnection({
        siteUrl: creds.typo3.siteUrl,
        siteKey: creds.typo3.siteKey,
        platform: "typo3",
      });
      return result.ok
        ? { ok: true, siteName: result.health?.version }
        : { ok: false, error: result.error };
    }
    case "linkedin": {
      if (!creds.linkedin) return null;
      const { testLinkedInConnection } = await import("@workspace/connectors/linkedin");
      const result = await testLinkedInConnection({
        accessToken: creds.linkedin.accessToken,
        authorUrn: creds.linkedin.authorUrn,
      });
      return result.ok
        ? { ok: true, siteName: result.displayName }
        : { ok: false, error: result.error };
    }
    case "twitter": {
      if (!creds.twitter) return null;
      const { testTwitterConnection } = await import("@workspace/connectors/twitter");
      const result = await testTwitterConnection({ accessToken: creds.twitter.accessToken });
      return result.ok
        ? { ok: true, siteName: result.screenName ? `@${result.screenName}` : undefined }
        : { ok: false, error: result.error };
    }
    case "meta": {
      if (!creds.meta) return null;
      const { testMetaConnection } = await import("@workspace/connectors/meta");
      const result = await testMetaConnection({
        accessToken: creds.meta.accessToken,
        pageId: creds.meta.pageId,
        instagramAccountId: creds.meta.instagramAccountId,
      });
      return result.ok
        ? { ok: true, siteName: result.pageName ?? result.instagramUsername }
        : { ok: false, error: result.error };
    }
    case "bluesky": {
      if (!creds.bluesky) return null;
      const { testBlueskyConnection } = await import("@workspace/connectors/bluesky");
      const result = await testBlueskyConnection(creds.bluesky);
      return result.ok
        ? { ok: true, siteName: result.handle ? `@${result.handle}` : undefined }
        : { ok: false, error: result.error };
    }
    case "mastodon": {
      if (!creds.mastodon) return null;
      const { testMastodonConnection } = await import("@workspace/connectors/mastodon");
      const result = await testMastodonConnection(creds.mastodon);
      return result.ok
        ? { ok: true, siteName: result.username }
        : { ok: false, error: result.error };
    }
    case "beehiiv": {
      if (!creds.beehiiv) return null;
      const { testBeehiivConnection } = await import("@workspace/connectors/beehiiv");
      const result = await testBeehiivConnection(creds.beehiiv);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "convertkit": {
      if (!creds.convertkit) return null;
      const { testConvertKitConnection } = await import("@workspace/connectors/convertkit");
      const result = await testConvertKitConnection(creds.convertkit);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    case "mailchimp": {
      if (!creds.mailchimp) return null;
      const { testMailchimpConnection } = await import("@workspace/connectors/mailchimp");
      const result = await testMailchimpConnection(creds.mailchimp);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    default:
      return null;
  }
}

/** CMS platforms with a live connector test or goals-ac-plugin health path. */
const CMS_TESTABLE_PLATFORMS = [
  "wordpress",
  "ghost",
  "shopify",
  "webflow",
  "notion",
  "drupal",
  "joomla",
  "webhook",
  "wix",
  "framer",
  "squarespace",
  "contentful",
  "sanity",
  "strapi",
  "hubspot",
  "typo3",
] as const;

/** Social destinations stored on cmsIntegrations. */
const SOCIAL_TESTABLE_PLATFORMS = [
  "linkedin",
  "twitter",
  "meta",
  "bluesky",
  "mastodon",
] as const;

/** Email service providers stored on cmsIntegrations. */
const ESP_TESTABLE_PLATFORMS = ["beehiiv", "convertkit", "mailchimp"] as const;

const TESTABLE_PLATFORMS = [
  ...CMS_TESTABLE_PLATFORMS,
  ...SOCIAL_TESTABLE_PLATFORMS,
  ...ESP_TESTABLE_PLATFORMS,
] as const;

type TestablePlatform = (typeof TESTABLE_PLATFORMS)[number];

/** Credentials live under the platform key; UI `connected` is derived at mask time. */
function hasPlatformCredentials(
  platform: TestablePlatform,
  decrypted: CmsIntegrationCredentials,
): boolean {
  return Boolean(decrypted[platform]);
}

/**
 * Run live health checks for every CMS, social, and ESP connection with
 * credentials on the project. Persists lastHealth* on each connection object.
 */
export async function runProjectIntegrationHealth(
  projectId: number,
): Promise<{ platforms: PlatformHealthStatus[]; checkedAt: string }> {
  const [project] = await db
    .select({
      id: websiteProjectsTable.id,
      cmsIntegrations: websiteProjectsTable.cmsIntegrations,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project) throw new Error("Project not found");

  const checkedAt = new Date().toISOString();
  const decrypted = decryptCmsCredentials(
    (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials,
  );

  const platforms: PlatformHealthStatus[] = [];

  for (const platform of TESTABLE_PLATFORMS) {
    const connected = hasPlatformCredentials(platform, decrypted);
    if (!connected) {
      platforms.push({
        platform,
        connected: false,
        ok: null,
        lastCheckedAt: checkedAt,
      });
      continue;
    }

    try {
      const result = await testPlatform(platform, decrypted);
      if (!result) {
        platforms.push({
          platform,
          connected: true,
          ok: false,
          error: "Credentials incomplete",
          lastCheckedAt: checkedAt,
        });
        continue;
      }
      platforms.push({
        platform,
        connected: true,
        ok: result.ok,
        error: result.error,
        siteName: result.siteName,
        lastCheckedAt: checkedAt,
      });
    } catch (err) {
      platforms.push({
        platform,
        connected: true,
        ok: false,
        error: err instanceof Error ? err.message : "Health check failed",
        lastCheckedAt: checkedAt,
      });
    }
  }

  const nextIntegrations = {
    ...((project.cmsIntegrations as Record<string, unknown> | null) ?? {}),
  };
  for (const status of platforms) {
    if (!status.connected) continue;
    const existing = (nextIntegrations[status.platform] as Record<string, unknown> | undefined) ?? {};
    nextIntegrations[status.platform] = {
      ...existing,
      lastHealthOk: status.ok,
      lastHealthError: status.error ?? null,
      lastHealthCheckedAt: checkedAt,
    };
  }

  await db
    .update(websiteProjectsTable)
    .set({ cmsIntegrations: nextIntegrations })
    .where(eq(websiteProjectsTable.id, projectId));

  return { platforms, checkedAt };
}
