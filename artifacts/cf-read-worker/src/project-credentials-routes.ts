import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import { websiteProjectsTable, type ContentStyle } from "@workspace/db/schema-sqlite";
import {
  getOrgEncryptedDeeplApiKey,
  loadDeeplCredentialContextForProject,
  maskEncryptedDeeplApiKeyLastFour,
  resolveDeeplApiKey,
  resolveDeeplCredentialSource,
} from "@workspace/content-engine/support/integrations/deepl-credentials";
import { maskStockCredentialLastFour } from "@workspace/content-engine/support/integrations/stock-credentials";
import {
  getPlatformStockImageStatus,
  isStockProviderId,
  listByokStockProviders,
  STOCK_PROVIDER_REGISTRY,
} from "@workspace/stock-images";
import { eq } from "drizzle-orm";
import { getAccessibleProject } from "./project-access";

function readTranslationSettings(contentStyle: ContentStyle | null) {
  return contentStyle?.translationSettings ?? {};
}

function readProjectEncrypted(contentStyle: ContentStyle | null) {
  return contentStyle?.imageSettings?.encryptedStockCredentials ?? {};
}

export async function handleProjectCredentialsRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;

  const deeplMatch = path.match(/^\/api\/website-projects\/(\d+)\/deepl-credentials$/);
  if (deeplMatch && method === "GET") {
    const projectId = Number.parseInt(deeplMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [row] = await db
      .select({
        contentStyle: websiteProjectsTable.contentStyle,
        organizationId: websiteProjectsTable.organizationId,
      })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);

    const contentStyle = (row?.contentStyle as ContentStyle | null) ?? null;
    const translationSettings = readTranslationSettings(contentStyle);
    const credentialContext = await loadDeeplCredentialContextForProject(projectId);
    const resolvedSource = resolveDeeplCredentialSource(credentialContext);
    const orgEncrypted =
      row?.organizationId != null ? await getOrgEncryptedDeeplApiKey(row.organizationId) : null;

    return withCors(
      request,
      Response.json({
        configured: Boolean(resolveDeeplApiKey(credentialContext)),
        resolvedSource,
        org: {
          configured: Boolean(orgEncrypted),
          apiKeyLastFour: maskEncryptedDeeplApiKeyLastFour(orgEncrypted),
        },
        project: {
          configured: Boolean(translationSettings.encryptedDeeplApiKey),
          apiKeyLastFour: maskEncryptedDeeplApiKeyLastFour(translationSettings.encryptedDeeplApiKey),
        },
        deeplRefinementEnabled: translationSettings.deeplRefinementEnabled !== false,
        deeplGlossaryId: translationSettings.deeplGlossaryId ?? "",
        docsUrl: "https://www.deepl.com/pro-api",
      }),
    );
  }

  const stockMatch = path.match(/^\/api\/website-projects\/(\d+)\/stock-credentials$/);
  if (stockMatch && method === "GET") {
    const projectId = Number.parseInt(stockMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [row] = await db
      .select({ contentStyle: websiteProjectsTable.contentStyle })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);

    const contentStyle = (row?.contentStyle as ContentStyle | null) ?? null;
    const encrypted = readProjectEncrypted(contentStyle);
    const masked = maskStockCredentialLastFour(encrypted);

    return withCors(
      request,
      Response.json({
        platform: getPlatformStockImageStatus(),
        project: Object.entries(masked).map(([provider, apiKeyLastFour]) => ({
          provider,
          apiKeyLastFour,
          billing: STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY].billing,
          searchImplemented:
            STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY].searchImplemented,
        })),
        providers: listByokStockProviders(),
      }),
    );
  }

  return null;
}
