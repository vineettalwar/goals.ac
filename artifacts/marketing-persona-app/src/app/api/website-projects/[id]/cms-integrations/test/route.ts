import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  resolveWordPressConnectionType,
} from "@workspace/content-engine/support/cms-integrations";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  try {
    const project = await getAccessibleProject(projectId, userId!);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const creds = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    const health: Record<string, { ok: boolean; error?: string; siteName?: string }> = {};

    if (creds.notion) {
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

    if (creds.webflow) {
      const { testWebflowConnection } = await import("@workspace/connectors/webflow");
      const result = await testWebflowConnection(creds.webflow.apiToken, creds.webflow.collectionId);
      health.webflow = result.ok ? { ok: true } : { ok: false, error: result.error };
    }

    if (creds.wordpress) {
      if (resolveWordPressConnectionType(creds.wordpress) === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.wordpress.siteUrl,
          siteKey: creds.wordpress.siteKey!,
          platform: "wordpress",
        });
        health.wordpress = result.ok
          ? { ok: true, siteName: result.health?.version }
          : { ok: false, error: result.error };
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

    if (creds.ghost) {
      const { testGhostConnection } = await import("@workspace/connectors/ghost");
      const result = await testGhostConnection(creds.ghost);
      health.ghost = result.ok
        ? { ok: true, siteName: result.siteTitle }
        : { ok: false, error: result.error };
    }

    if (creds.webhook) {
      const { testWebhookConnection } = await import("@workspace/connectors/webhook");
      const result = await testWebhookConnection(creds.webhook);
      health.webhook = result.ok ? { ok: true } : { ok: false, error: result.error };
    }

    if (creds.shopify) {
      if (creds.shopify.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.shopify.siteUrl!,
          siteKey: creds.shopify.siteKey!,
          platform: "shopify",
        });
        health.shopify = result.ok
          ? { ok: true, siteName: result.health?.version }
          : { ok: false, error: result.error };
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

    if (creds.drupal) {
      if (creds.drupal.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.drupal.siteUrl,
          siteKey: creds.drupal.siteKey!,
          platform: "drupal",
        });
        health.drupal = result.ok
          ? { ok: true, siteName: result.health?.version }
          : { ok: false, error: result.error };
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

    if (creds.joomla) {
      if (creds.joomla.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.joomla.siteUrl,
          siteKey: creds.joomla.siteKey!,
          platform: "joomla",
        });
        health.joomla = result.ok
          ? { ok: true, siteName: result.health?.version }
          : { ok: false, error: result.error };
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

    if (creds.linkedin) {
      const { testLinkedInConnection } = await import("@workspace/connectors/linkedin");
      const result = await testLinkedInConnection({
        accessToken: creds.linkedin.accessToken,
        authorUrn: creds.linkedin.authorUrn,
      });
      health.linkedin = result.ok
        ? { ok: true, siteName: result.displayName }
        : { ok: false, error: result.error };
    }

    if (creds.twitter) {
      const { testTwitterConnection } = await import("@workspace/connectors/twitter");
      const result = await testTwitterConnection({ accessToken: creds.twitter.accessToken });
      health.twitter = result.ok
        ? { ok: true, siteName: result.screenName ? `@${result.screenName}` : undefined }
        : { ok: false, error: result.error };
    }

    if (creds.meta) {
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

    if (creds.bluesky) {
      const { testBlueskyConnection } = await import("@workspace/connectors/bluesky");
      const result = await testBlueskyConnection(creds.bluesky);
      health.bluesky = result.ok
        ? { ok: true, siteName: result.handle ? `@${result.handle}` : undefined }
        : { ok: false, error: result.error };
    }

    if (creds.mastodon) {
      const { testMastodonConnection } = await import("@workspace/connectors/mastodon");
      const result = await testMastodonConnection(creds.mastodon);
      health.mastodon = result.ok
        ? { ok: true, siteName: result.username ? `@${result.username}` : undefined }
        : { ok: false, error: result.error };
    }

    if (creds.wix) {
      const { testWixConnection } = await import("@workspace/connectors/wix");
      const result = await testWixConnection(creds.wix);
      health.wix = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.framer) {
      const { testFramerConnection } = await import("@workspace/connectors/framer");
      const result = await testFramerConnection(creds.framer);
      health.framer = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.squarespace) {
      const { testSquarespaceConnection } = await import("@workspace/connectors/squarespace");
      const result = await testSquarespaceConnection(creds.squarespace);
      health.squarespace = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.contentful) {
      const { testContentfulConnection } = await import("@workspace/connectors/contentful");
      const result = await testContentfulConnection(creds.contentful);
      health.contentful = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.sanity) {
      const { testSanityConnection } = await import("@workspace/connectors/sanity");
      const result = await testSanityConnection(creds.sanity);
      health.sanity = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.strapi) {
      const { testStrapiConnection } = await import("@workspace/connectors/strapi");
      const result = await testStrapiConnection(creds.strapi);
      health.strapi = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.beehiiv) {
      const { testBeehiivConnection } = await import("@workspace/connectors/beehiiv");
      const result = await testBeehiivConnection(creds.beehiiv);
      health.beehiiv = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.convertkit) {
      const { testConvertKitConnection } = await import("@workspace/connectors/convertkit");
      const result = await testConvertKitConnection(creds.convertkit);
      health.convertkit = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.mailchimp) {
      const { testMailchimpConnection } = await import("@workspace/connectors/mailchimp");
      const result = await testMailchimpConnection(creds.mailchimp);
      health.mailchimp = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.hubspot) {
      const { testHubSpotConnection } = await import("@workspace/connectors/hubspot");
      const result = await testHubSpotConnection(creds.hubspot);
      health.hubspot = result.ok ? { ok: true } : { ok: false, error: result.error };
    }
    if (creds.typo3) {
      const { testTypo3Connection } = await import("@workspace/connectors/typo3");
      const result = await testTypo3Connection(creds.typo3);
      health.typo3 = result.ok ? { ok: true } : { ok: false, error: result.error };
    }

    return NextResponse.json(health);
  } catch (err) {
    console.error("Failed to test CMS integrations", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
