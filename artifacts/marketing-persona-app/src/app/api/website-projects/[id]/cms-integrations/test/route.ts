import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject, requireIntegrationsManage } from "@/lib/org/org-access";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  resolveWordPressConnectionType,
} from "@workspace/content-engine/support/cms-integrations";
import {
  type GoalsAcHealthResponse,
  parseAvailableOutputModes,
  parseRecommendedOutputMode,
} from "@workspace/connectors/goals-ac-plugin";

export type IntegrationHealthEntry = {
  ok: boolean;
  error?: string;
  siteName?: string;
  recommendedOutputMode?: string;
  availableOutputModes?: string[];
};

function pluginHealthEntry(result: {
  ok: boolean;
  health?: GoalsAcHealthResponse;
  error?: string;
  siteName?: string;
}): IntegrationHealthEntry {
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  const health = result.health;
  return {
    ok: true,
    siteName: result.siteName ?? health?.version,
    recommendedOutputMode: health ? parseRecommendedOutputMode(health) : undefined,
    availableOutputModes: health ? parseAvailableOutputModes(health) : undefined,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const platformFilter = new URL(req.url).searchParams.get("platform")?.trim() || null;

  const manage = await requireIntegrationsManage(userId!, projectId);
  if (!manage.ok) {
    return NextResponse.json({ error: manage.error }, { status: manage.status });
  }

  try {
    const project = await getAccessibleProject(projectId, userId!);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const creds = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    const health: Record<string, IntegrationHealthEntry> = {};
    const shouldTest = (key: string) => !platformFilter || platformFilter === key;

    if (creds.notion && shouldTest("notion")) {
      try {
        const testRes = await fetch(`https://api.notion.com/v1/databases/${creds.notion.databaseId}`, {
          headers: {
            Authorization: `Bearer ${creds.notion.integrationToken}`,
            "Notion-Version": "2022-06-28",
          },
        });
        if (testRes.ok) {
          health.notion = { ok: true };
        } else if (testRes.status === 401) {
          health.notion = { ok: false, error: "Invalid integration token" };
        } else if (testRes.status === 404) {
          health.notion = { ok: false, error: "Database not found or not shared with integration" };
        } else {
          health.notion = { ok: false, error: `Notion API error: ${testRes.status}` };
        }
      } catch (err) {
        health.notion = { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
      }
    }

    if (creds.webflow && shouldTest("webflow")) {
      const { testWebflowConnection } = await import("@workspace/connectors/webflow");
      const result = await testWebflowConnection(creds.webflow.apiToken, creds.webflow.collectionId);
      health.webflow = result.ok ? { ok: true } : { ok: false, error: result.error };
    }

    if (creds.wordpress && shouldTest("wordpress")) {
      if (resolveWordPressConnectionType(creds.wordpress) === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.wordpress.siteUrl,
          siteKey: creds.wordpress.siteKey!,
          platform: "wordpress",
        });
        health.wordpress = pluginHealthEntry(result);
      } else {
        const { testWordPressConnection } = await import("@workspace/connectors/wordpress");
        const result = await testWordPressConnection({
          siteUrl: creds.wordpress.siteUrl,
          username: creds.wordpress.username ?? "",
          appPassword: creds.wordpress.appPassword ?? "",
        });
        health.wordpress = result.ok
          ? { ok: true, siteName: result.siteName }
          : { ok: false, error: result.error };
      }
    }

    if (creds.ghost && shouldTest("ghost")) {
      const { testGhostConnection } = await import("@workspace/connectors/ghost");
      const result = await testGhostConnection(creds.ghost);
      health.ghost = result.ok
        ? { ok: true, siteName: result.siteTitle }
        : { ok: false, error: result.error };
    }

    if (creds.webhook && shouldTest("webhook")) {
      const { testWebhookConnection } = await import("@workspace/connectors/webhook");
      const result = await testWebhookConnection(creds.webhook);
      health.webhook = result.ok ? { ok: true } : { ok: false, error: result.error };
    }

    if (creds.shopify && shouldTest("shopify")) {
      if (creds.shopify.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.shopify.siteUrl!,
          siteKey: creds.shopify.siteKey!,
          platform: "shopify",
        });
        health.shopify = pluginHealthEntry(result);
      } else {
        const { testShopifyConnection } = await import("@workspace/connectors/shopify");
        const result = await testShopifyConnection({
          shopDomain: creds.shopify.shopDomain!,
          accessToken: creds.shopify.accessToken!,
          blogId: creds.shopify.blogId,
        });
        health.shopify = result.ok
          ? { ok: true, siteName: result.shopName }
          : { ok: false, error: result.error };
      }
    }

    if (creds.drupal && shouldTest("drupal")) {
      if (creds.drupal.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.drupal.siteUrl,
          siteKey: creds.drupal.siteKey!,
          platform: "drupal",
        });
        health.drupal = pluginHealthEntry(result);
      } else {
        const { testDrupalConnection } = await import("@workspace/connectors/drupal");
        const result = await testDrupalConnection({
          siteUrl: creds.drupal.siteUrl,
          authType: creds.drupal.authType ?? "basic",
          username: creds.drupal.username,
          password: creds.drupal.password,
          accessToken: creds.drupal.accessToken,
        });
        health.drupal = result.ok
          ? { ok: true, siteName: result.siteName }
          : { ok: false, error: result.error };
      }
    }

    if (creds.joomla && shouldTest("joomla")) {
      if (creds.joomla.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.joomla.siteUrl,
          siteKey: creds.joomla.siteKey!,
          platform: "joomla",
        });
        health.joomla = pluginHealthEntry(result);
      } else {
        const { testJoomlaConnection } = await import("@workspace/connectors/joomla");
        const result = await testJoomlaConnection({
          siteUrl: creds.joomla.siteUrl,
          apiToken: creds.joomla.apiToken!,
        });
        health.joomla = result.ok
          ? { ok: true, siteName: result.siteName }
          : { ok: false, error: result.error };
      }
    }

    if (creds.linkedin && shouldTest("linkedin")) {
      const { testLinkedInConnection } = await import("@workspace/connectors/linkedin");
      const result = await testLinkedInConnection({
        accessToken: creds.linkedin.accessToken,
        authorUrn: creds.linkedin.authorUrn,
      });
      health.linkedin = result.ok
        ? { ok: true, siteName: result.displayName }
        : { ok: false, error: result.error };
    }

    if (creds.twitter && shouldTest("twitter")) {
      const { testTwitterConnection } = await import("@workspace/connectors/twitter");
      const result = await testTwitterConnection({ accessToken: creds.twitter.accessToken });
      health.twitter = result.ok
        ? { ok: true, siteName: result.screenName ? `@${result.screenName}` : undefined }
        : { ok: false, error: result.error };
    }

    if (creds.meta && shouldTest("meta")) {
      const { testMetaConnection } = await import("@workspace/connectors/meta");
      const result = await testMetaConnection({
        accessToken: creds.meta.accessToken,
        pageId: creds.meta.pageId,
        instagramAccountId: creds.meta.instagramAccountId,
      });
      health.meta = result.ok
        ? { ok: true, siteName: result.pageName ?? result.instagramUsername }
        : { ok: false, error: result.error };
    }

    if (creds.bluesky && shouldTest("bluesky")) {
      const { testBlueskyConnection } = await import("@workspace/connectors/bluesky");
      const result = await testBlueskyConnection(creds.bluesky);
      health.bluesky = result.ok
        ? { ok: true, siteName: result.handle ? `@${result.handle}` : undefined }
        : { ok: false, error: result.error };
    }

    if (creds.mastodon && shouldTest("mastodon")) {
      const { testMastodonConnection } = await import("@workspace/connectors/mastodon");
      const result = await testMastodonConnection(creds.mastodon);
      health.mastodon = result.ok
        ? { ok: true, siteName: result.username ? `@${result.username}` : undefined }
        : { ok: false, error: result.error };
    }

    if (creds.wix && shouldTest("wix")) {
      const { testWixConnection } = await import("@workspace/connectors/wix");
      const result = await testWixConnection(creds.wix);
      health.wix = result.ok ? { ok: true } : { ok: false, error: result.error };
    }

    const tailTests = await Promise.allSettled(
      [
        creds.framer && shouldTest("framer")
          ? (async () => {
              const { testFramerConnection } = await import("@workspace/connectors/framer");
              return { key: "framer", result: await testFramerConnection(creds.framer!) };
            })()
          : null,
        creds.squarespace && shouldTest("squarespace")
          ? (async () => {
              const { testSquarespaceConnection } = await import("@workspace/connectors/squarespace");
              return { key: "squarespace", result: await testSquarespaceConnection(creds.squarespace!) };
            })()
          : null,
        creds.contentful && shouldTest("contentful")
          ? (async () => {
              const { testContentfulConnection } = await import("@workspace/connectors/contentful");
              return { key: "contentful", result: await testContentfulConnection(creds.contentful!) };
            })()
          : null,
        creds.sanity && shouldTest("sanity")
          ? (async () => {
              const { testSanityConnection } = await import("@workspace/connectors/sanity");
              return { key: "sanity", result: await testSanityConnection(creds.sanity!) };
            })()
          : null,
        creds.strapi && shouldTest("strapi")
          ? (async () => {
              const { testStrapiConnection } = await import("@workspace/connectors/strapi");
              return { key: "strapi", result: await testStrapiConnection(creds.strapi!) };
            })()
          : null,
        creds.beehiiv && shouldTest("beehiiv")
          ? (async () => {
              const { testBeehiivConnection } = await import("@workspace/connectors/beehiiv");
              return { key: "beehiiv", result: await testBeehiivConnection(creds.beehiiv!) };
            })()
          : null,
        creds.convertkit && shouldTest("convertkit")
          ? (async () => {
              const { testConvertKitConnection } = await import("@workspace/connectors/convertkit");
              return { key: "convertkit", result: await testConvertKitConnection(creds.convertkit!) };
            })()
          : null,
        creds.mailchimp && shouldTest("mailchimp")
          ? (async () => {
              const { testMailchimpConnection } = await import("@workspace/connectors/mailchimp");
              return { key: "mailchimp", result: await testMailchimpConnection(creds.mailchimp!) };
            })()
          : null,
        creds.hubspot && shouldTest("hubspot")
          ? (async () => {
              const { testHubSpotConnection } = await import("@workspace/connectors/hubspot");
              return { key: "hubspot", result: await testHubSpotConnection(creds.hubspot!) };
            })()
          : null,
        creds.typo3 && shouldTest("typo3")
          ? (async () => {
              const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
              const result = await testGoalsAcPluginConnection({
                siteUrl: creds.typo3!.siteUrl,
                siteKey: creds.typo3!.siteKey,
                platform: "typo3",
              });
              return { key: "typo3", result };
            })()
          : null,
      ].filter(Boolean) as Array<
        Promise<{ key: string; result: { ok: boolean; health?: GoalsAcHealthResponse; error?: string } }>
      >,
    );

    for (const entry of tailTests) {
      if (entry.status !== "fulfilled") continue;
      const { key, result } = entry.value;
      if (key === "typo3") {
        health[key] = pluginHealthEntry(result);
      } else {
        health[key] = result.ok ? { ok: true } : { ok: false, error: result.error };
      }
    }

    return NextResponse.json(health);
  } catch (err) {
    console.error("Failed to test CMS integrations", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
