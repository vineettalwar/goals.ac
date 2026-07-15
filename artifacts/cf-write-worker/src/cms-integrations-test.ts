import { withCors } from "@workspace/cf-edge/cors";
import { z } from "zod";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  resolveWordPressConnectionType,
} from "@workspace/content-engine/support/publishing/cms-integrations";
import {
  type GoalsAcHealthResponse,
  parseAvailableOutputModes,
  parseRecommendedOutputMode,
} from "@workspace/connectors/goals-ac-plugin";
import { getAccessibleProject } from "./project-access";

export type IntegrationHealthEntry = {
  ok: boolean;
  error?: string;
  siteName?: string;
  recommendedOutputMode?: string;
  availableOutputModes?: string[];
};

const testBody = z.object({
  platform: z.string().min(1).optional(),
});

const CMS_PLATFORMS = new Set([
  "notion",
  "webflow",
  "wordpress",
  "ghost",
  "webhook",
  "shopify",
  "drupal",
  "joomla",
]);

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

function requireEncryptionSecret(request: Request): Response | null {
  if (process.env.GEMINI_KEY_ENCRYPTION_SECRET) return null;
  return withCors(
    request,
    Response.json(
      {
        error:
          "CMS credential encryption is not configured on the API worker (GEMINI_KEY_ENCRYPTION_SECRET).",
      },
      { status: 503 },
    ),
  );
}

async function testNotion(creds: NonNullable<CmsIntegrationCredentials["notion"]>): Promise<IntegrationHealthEntry> {
  try {
    const testRes = await fetch(`https://api.notion.com/v1/databases/${creds.databaseId}`, {
      headers: {
        Authorization: `Bearer ${creds.integrationToken}`,
        "Notion-Version": "2022-06-28",
      },
    });
    if (testRes.ok) return { ok: true };
    if (testRes.status === 401) return { ok: false, error: "Invalid integration token" };
    if (testRes.status === 404) {
      return { ok: false, error: "Database not found or not shared with integration" };
    }
    return { ok: false, error: `Notion API error: ${testRes.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

async function testPlatform(
  key: string,
  creds: CmsIntegrationCredentials,
): Promise<IntegrationHealthEntry | null> {
  switch (key) {
    case "notion": {
      if (!creds.notion) return null;
      return testNotion(creds.notion);
    }
    case "webflow": {
      if (!creds.webflow) return null;
      const { testWebflowConnection } = await import("@workspace/connectors/webflow");
      const result = await testWebflowConnection(creds.webflow.apiToken, creds.webflow.collectionId);
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
        return pluginHealthEntry(result);
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
    case "shopify": {
      if (!creds.shopify) return null;
      if (creds.shopify.connectionType === "plugin") {
        const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
        const result = await testGoalsAcPluginConnection({
          siteUrl: creds.shopify.siteUrl!,
          siteKey: creds.shopify.siteKey!,
          platform: "shopify",
        });
        return pluginHealthEntry(result);
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
        return pluginHealthEntry(result);
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
        return pluginHealthEntry(result);
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
    default:
      return null;
  }
}

export async function handleCmsIntegrationsTest(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const testMatch = path.match(/^\/api\/website-projects\/(\d+)\/cms-integrations\/test$/);
  if (!testMatch || request.method !== "POST") return null;

  const configError = requireEncryptionSecret(request);
  if (configError) return configError;

  const projectId = Number.parseInt(testMatch[1]!, 10);
  if (!Number.isFinite(projectId)) {
    return withCors(request, Response.json({ error: "Invalid project id" }, { status: 400 }));
  }

  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const parsed = testBody.safeParse(body);
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const platformFilter =
    parsed.data.platform?.trim() || url.searchParams.get("platform")?.trim() || null;

  if (platformFilter && !CMS_PLATFORMS.has(platformFilter)) {
    return withCors(request, Response.json({ error: "Invalid platform" }, { status: 400 }));
  }

  try {
    const creds = decryptCmsCredentials(
      ((project as { cmsIntegrations?: CmsIntegrationCredentials }).cmsIntegrations ??
        {}) as CmsIntegrationCredentials,
    );
    const health: Record<string, IntegrationHealthEntry> = {};
    const shouldTest = (key: string) => !platformFilter || platformFilter === key;

    for (const key of CMS_PLATFORMS) {
      if (!shouldTest(key)) continue;
      const entry = await testPlatform(key, creds);
      if (entry) health[key] = entry;
    }

    return withCors(request, Response.json(health));
  } catch (err) {
    console.error("Failed to test CMS integrations", err);
    return withCors(request, Response.json({ error: "Internal server error" }, { status: 500 }));
  }
}
