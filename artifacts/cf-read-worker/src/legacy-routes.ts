import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import {
  apiKeysTable,
  companiesTable,
  conversations,
  marketingPersonasTable,
  seoArticlesTable,
} from "@workspace/db/schema-sqlite";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { requireSiteAdminAccess } from "@workspace/cf-edge/project-access";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getAccessibleProject, parsePositiveInt } from "./project-access";

export async function handleLegacyRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;
  const url = new URL(request.url);

  if (path === "/api/auth/gemini-key" && method === "GET") {
    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings?.encryptedGeminiKey) {
      return withCors(request, Response.json({ hasKey: false }));
    }
    return withCors(request, Response.json({ hasKey: true, lastFour: "••••" }));
  }

  if (path === "/api/conversations" && method === "GET") {
    const list = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(50);
    return withCors(request, Response.json({ conversations: list }));
  }

  if (path === "/api/personas" && method === "GET") {
    const companyId = parsePositiveInt(url.searchParams.get("companyId"));
    if (!companyId) {
      return withCors(request, Response.json({ error: "companyId required" }, { status: 400 }));
    }

    const [company] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(and(eq(companiesTable.id, companyId), eq(companiesTable.userId, userId)))
      .limit(1);

    if (!company) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }

    const personas = await db
      .select()
      .from(marketingPersonasTable)
      .where(eq(marketingPersonasTable.companyId, companyId));

    return withCors(request, Response.json({ personas }));
  }

  if (path === "/api/org/api-keys" && method === "GET") {
    const siteAdmin = await requireSiteAdminAccess(userId);
    if (!siteAdmin.ok) {
      return withCors(request, Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }));
    }

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const keys = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        scopes: apiKeysTable.scopes,
        rateLimitPerHour: apiKeysTable.rateLimitPerHour,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
      })
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.organizationId, orgSettings.organizationId),
          isNull(apiKeysTable.revokedAt),
        ),
      )
      .orderBy(desc(apiKeysTable.createdAt));

    return withCors(request, Response.json({ keys }));
  }

  const seoArticleMatch = path.match(/^\/api\/seo-articles\/(\d+)$/);
  if (seoArticleMatch && method === "GET") {
    const articleId = Number.parseInt(seoArticleMatch[1]!, 10);
    const [article] = await db
      .select()
      .from(seoArticlesTable)
      .where(eq(seoArticlesTable.id, articleId))
      .limit(1);

    if (!article) {
      return withCors(request, Response.json({ error: "Article not found" }, { status: 404 }));
    }

    if (article.websiteProjectId) {
      const project = await getAccessibleProject(article.websiteProjectId, userId);
      if (!project) {
        return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
      }
    }

    return withCors(request, Response.json(article));
  }

  return null;
}
