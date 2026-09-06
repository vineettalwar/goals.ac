import { eq, inArray } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import {
  clearSessionCookie,
  requestUsesSecureCookies,
} from "@workspace/cf-edge/session-cookie";
import { db } from "./db";
import {
  usersTable,
  websiteProjectsTable,
  contentStrategiesTable,
  contentItemsTable,
  seoArticlesTable,
  geoAuditsTable,
  competitorAnalysesTable,
  keywordAnalysesTable,
} from "@workspace/db/schema-sqlite";

function jsonWithCookie(request: Request, body: unknown, cookie: string, status = 200): Response {
  return withCors(
    request,
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    }),
  );
}

async function deleteUserData(userId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const userProjects = await tx
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, userId));

    if (userProjects.length > 0) {
      const projectIds = userProjects.map((p) => p.id);

      const strategies = await tx
        .select({ id: contentStrategiesTable.id })
        .from(contentStrategiesTable)
        .where(inArray(contentStrategiesTable.websiteProjectId, projectIds));

      if (strategies.length > 0) {
        const strategyIds = strategies.map((s) => s.id);
        await tx.delete(contentItemsTable).where(inArray(contentItemsTable.strategyId, strategyIds));
      }

      await tx
        .delete(contentStrategiesTable)
        .where(inArray(contentStrategiesTable.websiteProjectId, projectIds));
      await tx.delete(seoArticlesTable).where(inArray(seoArticlesTable.websiteProjectId, projectIds));
      await tx.delete(geoAuditsTable).where(inArray(geoAuditsTable.websiteProjectId, projectIds));
      await tx
        .delete(competitorAnalysesTable)
        .where(inArray(competitorAnalysesTable.websiteProjectId, projectIds));
      await tx
        .delete(keywordAnalysesTable)
        .where(inArray(keywordAnalysesTable.websiteProjectId, projectIds));
    }

    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });
}

export async function handleAuthDeleteAccount(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/auth/me/delete" || request.method !== "DELETE") {
    return null;
  }

  try {
    await deleteUserData(userId);
    const secure = requestUsesSecureCookies(request);
    return jsonWithCookie(request, { ok: true }, clearSessionCookie(secure));
  } catch (err) {
    console.error("[auth-delete-account]", err);
    return withCors(request, Response.json({ error: "Internal server error" }, { status: 500 }));
  }
}
