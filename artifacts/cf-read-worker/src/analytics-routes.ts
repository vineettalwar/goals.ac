import { db } from "./db";
import { sumAsInt } from "@workspace/db";
import {
  analyticsPropertyConnectionsTable,
  gscSearchQueriesTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import {
  encryptStoredTokens,
  listGa4PropertiesForConnection,
  parseStoredTokens,
  rankGa4Properties,
  resolveAccessToken,
  type AnalyticsPropertyTokenEnv,
} from "@workspace/cf-edge/analytics-property-client";
import { getArticlePerformance } from "@workspace/content-engine/analytics/article-performance";
import {
  getDecryptedSemrushCredentialsForUser,
  getOrgAiSettingsForUser,
  hasOrgSemrushCredentials,
} from "@workspace/content-engine/support/ai/org-ai-settings";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import {
  contentLanguageLabel,
  isSemrushDatabaseMismatch,
  semrushDatabaseForLanguage,
} from "@workspace/content-engine/support/content/content-language";
import type { ContentStyle } from "@workspace/db/schema-sqlite";
import { defaultSyncDateRange } from "@workspace/seo-tools";
import { requireProjectAccess } from "./project-access";

export async function handleAnalyticsRead(
  request: Request,
  path: string,
  userId: number,
  env: AnalyticsPropertyTokenEnv = {},
): Promise<Response | null> {
  const method = request.method;
  const url = new URL(request.url);

  const gscQueriesMatch = path.match(/^\/api\/website-projects\/(\d+)\/gsc-queries$/);
  if (gscQueriesMatch && method === "GET") {
    const projectId = Number.parseInt(gscQueriesMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const defaultRange = defaultSyncDateRange(28);
    const startDate = url.searchParams.get("startDate") ?? defaultRange.startDate;
    const endDate = url.searchParams.get("endDate") ?? defaultRange.endDate;
    const minImpressions = Number(url.searchParams.get("minImpressions") ?? "0");
    const minPosition = Number(url.searchParams.get("minPosition") ?? "0");
    const maxPosition = Number(url.searchParams.get("maxPosition") ?? "100");
    const limit = Math.min(200, Number(url.searchParams.get("limit") ?? "50"));
    const offset = Number(url.searchParams.get("offset") ?? "0");

    const rows = await db
      .select({
        query: gscSearchQueriesTable.query,
        impressions: sumAsInt(gscSearchQueriesTable.impressions),
        clicks: sumAsInt(gscSearchQueriesTable.clicks),
        ctr: sql<number>`case when sum(${gscSearchQueriesTable.impressions}) > 0 then cast(sum(${gscSearchQueriesTable.clicks}) as real) / sum(${gscSearchQueriesTable.impressions}) else 0 end`,
        position: sql<number>`case when sum(${gscSearchQueriesTable.impressions}) > 0 then sum(${gscSearchQueriesTable.position} * ${gscSearchQueriesTable.impressions}) / sum(${gscSearchQueriesTable.impressions}) else 0 end`,
      })
      .from(gscSearchQueriesTable)
      .where(
        and(
          eq(gscSearchQueriesTable.projectId, projectId),
          gte(gscSearchQueriesTable.date, startDate),
          lte(gscSearchQueriesTable.date, endDate),
        ),
      )
      .groupBy(gscSearchQueriesTable.query)
      .orderBy(desc(sql`sum(${gscSearchQueriesTable.impressions})`))
      .limit(limit)
      .offset(offset);

    return withCors(
      request,
      Response.json({
        queries: rows,
        dateRange: { startDate, endDate },
        pagination: { limit, offset },
      }),
    );
  }

  const analyticsAvailableMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/analytics-properties\/available$/,
  );
  if (analyticsAvailableMatch && method === "POST") {
    const projectId = Number.parseInt(analyticsAvailableMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const [project] = await db
      .select({ url: websiteProjectsTable.url })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [connection] = await db
      .select({
        id: analyticsPropertyConnectionsTable.id,
        encryptedTokens: analyticsPropertyConnectionsTable.encryptedTokens,
      })
      .from(analyticsPropertyConnectionsTable)
      .where(
        and(
          eq(analyticsPropertyConnectionsTable.projectId, projectId),
          eq(analyticsPropertyConnectionsTable.provider, "google_analytics_4"),
        ),
      )
      .limit(1);

    if (!connection) {
      return withCors(
        request,
        Response.json({ error: "Connect Google Analytics first" }, { status: 404 }),
      );
    }

    try {
      let tokens = parseStoredTokens(connection.encryptedTokens);
      const resolved = await resolveAccessToken(tokens, env);
      tokens = resolved.tokens;

      if (resolved.refreshed) {
        await db
          .update(analyticsPropertyConnectionsTable)
          .set({ encryptedTokens: encryptStoredTokens(tokens) })
          .where(eq(analyticsPropertyConnectionsTable.id, connection.id));
      }

      const rawProperties = await listGa4PropertiesForConnection(resolved.accessToken);
      const properties = rankGa4Properties(project.url, rawProperties);

      return withCors(
        request,
        Response.json({
          properties,
          projectUrl: project.url,
        }),
      );
    } catch {
      return withCors(
        request,
        Response.json({ error: "Failed to load verified properties" }, { status: 502 }),
      );
    }
  }

  const analyticsPropsMatch = path.match(/^\/api\/website-projects\/(\d+)\/analytics-properties$/);
  if (analyticsPropsMatch && method === "GET") {
    const projectId = Number.parseInt(analyticsPropsMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const rows = await db
      .select()
      .from(analyticsPropertyConnectionsTable)
      .where(eq(analyticsPropertyConnectionsTable.projectId, projectId));
    return withCors(request, Response.json({ properties: rows }));
  }

  const articlePerfMatch = path.match(/^\/api\/website-projects\/(\d+)\/article-performance$/);
  if (articlePerfMatch && method === "GET") {
    const projectId = Number.parseInt(articlePerfMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const defaultRange = defaultSyncDateRange(28);
    const startDate = url.searchParams.get("startDate") ?? defaultRange.startDate;
    const endDate = url.searchParams.get("endDate") ?? defaultRange.endDate;
    const performance = await getArticlePerformance(projectId, startDate, endDate);
    return withCors(request, Response.json(performance));
  }

  const semrushStatusMatch = path.match(/^\/api\/website-projects\/(\d+)\/semrush\/status$/);
  if (semrushStatusMatch && method === "GET") {
    const projectId = Number.parseInt(semrushStatusMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const [orgSettings, credentials, [project]] = await Promise.all([
      getOrgAiSettingsForUser(userId),
      getDecryptedSemrushCredentialsForUser(userId),
      db
        .select({
          autopilotSettings: websiteProjectsTable.autopilotSettings,
          contentStyle: websiteProjectsTable.contentStyle,
        })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1),
    ]);

    const settings = parseAutopilotSettings(project?.autopilotSettings);
    const primaryLanguage =
      (project?.contentStyle as ContentStyle | null)?.primaryLanguage ?? "en";
    const database = orgSettings?.semrushDatabase ?? "us";
    const suggestedDatabase = semrushDatabaseForLanguage(primaryLanguage);

    return withCors(
      request,
      Response.json({
        configured: hasOrgSemrushCredentials(orgSettings) && Boolean(credentials),
        database,
        primaryLanguage,
        primaryLanguageLabel: contentLanguageLabel(primaryLanguage),
        suggestedDatabase,
        databaseMismatch: isSemrushDatabaseMismatch(primaryLanguage, database),
        lastDiscoveryAt: settings.lastSemrushDiscoveryAt ?? null,
      }),
    );
  }

  return null;
}
