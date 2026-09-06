import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { db } from "./db";
import {
  articleIdeaSourcesTable,
  keywordAnalysesTable,
  keywordOpportunitiesTable,
  keywordRankAlertsTable,
  keywordRankSnapshotsTable,
  trackedKeywordsTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import type { ContentStyle } from "@workspace/db/schema-sqlite";
import {
  insertArticleIdeas,
  mapCsvHeaders,
  parseCsvText,
  parseSheetUrlOrId,
  syncArticleIdeaSource,
  validateArticleIdeaRows,
  validateCsvUpload,
} from "@workspace/content-engine/articles/article-ideas-import-service";
import {
  discoverOpportunities,
  queueOpportunityToStrategy,
  queueOpportunityAndGenerate,
  buildBriefFromOpportunity,
} from "@workspace/content-engine/strategy/keyword-opportunity-service";
import { getDecryptedSemrushCredentialsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { buildLanguagePromptLine } from "@workspace/content-engine/support/content/content-language";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { analyzeKeywords } from "@workspace/seo-tools/keywordAnalyzer";
import { isSerpConfigured } from "@workspace/serp-provider";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { getAccessibleProject, requireProjectAccess, requireSiteAdminAccess } from "./project-access";

const CreateTrackedKeywordBody = z.object({
  websiteProjectId: z.number().int().positive(),
  projectId: z.number().int().positive().optional(),
  keyword: z.string().min(1).max(200),
  targetUrl: z.string().url().optional(),
  location: z.string().min(1).optional(),
  language: z.string().min(2).max(10).optional(),
  device: z.enum(["desktop", "mobile"]).optional(),
});

const KeywordAnalysisBody = z.object({
  keywords: z.array(z.string().min(1).max(200)).min(1).max(10),
  websiteUrl: z.string().url().optional(),
  websiteProjectId: z.number().int().positive().optional(),
});

const ManualIdeaSchema = z.object({
  keyword: z.string().min(1),
  suggestedTitle: z.string().min(1),
  suggestedAngle: z.string().optional(),
  estimatedVolume: z.string().optional(),
  intent: z.string().optional(),
  difficulty: z.enum(["low", "medium", "high"]).optional(),
});

const ManualBodySchema = z.union([
  ManualIdeaSchema,
  z.object({ ideas: z.array(ManualIdeaSchema).min(1) }),
]);

const CreateSheetSourceSchema = z.object({
  label: z.string().min(1),
  spreadsheetUrl: z.string().min(1),
  sheetName: z.string().optional(),
  sheetGid: z.string().optional(),
  columnMapping: z
    .object({
      keyword: z.string().optional(),
      title: z.string().optional(),
      angle: z.string().optional(),
      volume: z.string().optional(),
      intent: z.string().optional(),
      difficulty: z.string().optional(),
    })
    .optional(),
});

const UpdateAlertBody = z.object({
  status: z.enum(["open", "dismissed", "actioned"]),
});

async function requireImportSiteAdmin(
  request: Request,
  userId: number,
): Promise<Response | null> {
  const siteAdmin = await requireSiteAdminAccess(userId);
  if (!siteAdmin.ok) {
    return withCors(
      request,
      Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }),
    );
  }
  return null;
}

export async function handleKeywordWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/tracked-keywords" && request.method === "POST") {
    if (!isSerpConfigured()) {
      return withCors(
        request,
        Response.json(
          {
            error:
              "Rank tracking is not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
          },
          { status: 503 },
        ),
      );
    }

    const parsed = CreateTrackedKeywordBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    const projectId = parsed.data.websiteProjectId ?? parsed.data.projectId!;
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [row] = await db
      .insert(trackedKeywordsTable)
      .values({
        websiteProjectId: projectId,
        keyword: parsed.data.keyword.trim().toLowerCase(),
        targetUrl: parsed.data.targetUrl ?? null,
        location: parsed.data.location ?? "United States",
        language: parsed.data.language ?? "en",
        device: parsed.data.device ?? "desktop",
      })
      .returning();

    const jobId = await sendToCfQueue(QUEUES.keywordRankCheck, { trackedKeywordId: row!.id });
    return withCors(
      request,
      Response.json(
        { ...row, jobId: jobId ?? null },
        { status: 201 },
      ),
    );
  }

  if (path === "/api/tracked-keywords" && request.method === "DELETE") {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isFinite(id)) {
      return withCors(request, Response.json({ error: "id query parameter is required" }, { status: 400 }));
    }

    const [row] = await db
      .select()
      .from(trackedKeywordsTable)
      .where(eq(trackedKeywordsTable.id, id))
      .limit(1);
    if (!row) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }

    const project = await getAccessibleProject(row.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }

    await db
      .delete(keywordRankSnapshotsTable)
      .where(eq(keywordRankSnapshotsTable.trackedKeywordId, id));
    await db.delete(trackedKeywordsTable).where(eq(trackedKeywordsTable.id, id));
    return withCors(request, Response.json({ ok: true }));
  }

  const trackedDeleteMatch = path.match(/^\/api\/tracked-keywords\/(\d+)$/);
  if (trackedDeleteMatch && request.method === "DELETE") {
    const id = Number.parseInt(trackedDeleteMatch[1]!, 10);
    const [row] = await db
      .select()
      .from(trackedKeywordsTable)
      .where(eq(trackedKeywordsTable.id, id))
      .limit(1);
    if (!row) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const project = await getAccessibleProject(row.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    await db
      .delete(keywordRankSnapshotsTable)
      .where(eq(keywordRankSnapshotsTable.trackedKeywordId, id));
    await db.delete(trackedKeywordsTable).where(eq(trackedKeywordsTable.id, id));
    return withCors(request, Response.json({ ok: true }));
  }

  if (path === "/api/keyword-analysis" && request.method === "POST") {
    const parsed = KeywordAnalysisBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    if (parsed.data.websiteProjectId) {
      const project = await getAccessibleProject(parsed.data.websiteProjectId, userId);
      if (!project) {
        return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
      }
    }

    let contentLanguage: string | undefined;
    if (parsed.data.websiteProjectId) {
      const [project] = await db
        .select({ contentStyle: websiteProjectsTable.contentStyle })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, parsed.data.websiteProjectId))
        .limit(1);
      contentLanguage = (project?.contentStyle as ContentStyle | null)?.primaryLanguage;
    }

    const billingPrep = await prepareAiBilling({
      userId,
      tier: "planning",
      quotaKind: "article",
    });
    if (!billingPrep.ok) return withCors(request, billingPrep.response);

    try {
      const [userApiKey, aiProviderOptions, semrushCredentials] = await Promise.all([
        getDecryptedUserGeminiKey(userId),
        getUserAiProviderOptions(userId),
        getDecryptedSemrushCredentialsForUser(userId),
      ]);

      const analysis = await analyzeKeywords({
        keywords: parsed.data.keywords,
        websiteUrl: parsed.data.websiteUrl,
        userApiKey,
        aiProviderOptions,
        semrushCredentials,
        languagePromptLine: buildLanguagePromptLine(contentLanguage),
      });

      const [saved] = await db
        .insert(keywordAnalysesTable)
        .values({
          websiteProjectId: parsed.data.websiteProjectId ?? null,
          keywords: parsed.data.keywords,
          websiteUrl: parsed.data.websiteUrl ?? null,
          result: analysis,
        })
        .returning();

      await completeAiBilling(billingPrep.ctx, {
        userId,
        eventType: "keyword_analysis",
        usedByok: billingPrep.usedByok,
        tier: "planning",
      });

      return withCors(request, Response.json({ ...analysis, id: saved?.id }));
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx);
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Analysis failed" },
          { status: 502 },
        ),
      );
    }
  }

  const keywordOppDiscoverMatch = path.match(/^\/api\/website-projects\/(\d+)\/keyword-opportunities$/);
  if (keywordOppDiscoverMatch && request.method === "POST") {
    const projectId = Number.parseInt(keywordOppDiscoverMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const body = (await request.json().catch(() => ({}))) as {
      async?: boolean;
      refresh?: boolean;
      source?: string;
    };
    const source =
      body.source === "gsc" ? "gsc" : body.source === "ai" ? "ai" : body.source === "semrush" ? "semrush" : "all";

    try {
      if (source === "semrush") {
        const limited = await rateLimitResponse(
          `semrush-discovery:project:${projectId}`,
          RATE_LIMITS.SEMRUSH_DISCOVERY_PER_PROJECT.limit,
          RATE_LIMITS.SEMRUSH_DISCOVERY_PER_PROJECT.windowMs,
        );
        if (limited) return withCors(request, limited);

        const credentials = await getDecryptedSemrushCredentialsForUser(userId);
        if (!credentials) {
          return withCors(
            request,
            Response.json(
              { error: "Semrush is not configured. Add your API key in Settings." },
              { status: 400 },
            ),
          );
        }
      }

      if (body.async) {
        const jobId = await sendToCfQueue(QUEUES.keywordOpportunitySweep, { projectId, userId });
        return withCors(
          request,
          acceptedJobResponse(jobId ?? `cf:${QUEUES.keywordOpportunitySweep}:${Date.now()}`, QUEUES.keywordOpportunitySweep),
        );
      }

      const inserted = await discoverOpportunities(projectId, userId, {
        sources: [source],
        refresh: body.refresh === true,
      });
      return withCors(request, Response.json({ inserted }));
    } catch (err) {
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Discovery failed" },
          { status: 502 },
        ),
      );
    }
  }

  const keywordOppQueueMatch = path.match(/^\/api\/keyword-opportunities\/(\d+)$/);
  if (keywordOppQueueMatch && request.method === "POST") {
    const oppId = Number.parseInt(keywordOppQueueMatch[1]!, 10);
    const [opp] = await db
      .select()
      .from(keywordOpportunitiesTable)
      .where(eq(keywordOpportunitiesTable.id, oppId))
      .limit(1);
    if (!opp) {
      return withCors(request, Response.json({ error: "Opportunity not found" }, { status: 404 }));
    }
    const project = await getAccessibleProject(opp.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const body = z.object({ generate: z.boolean().optional() }).safeParse(
      await request.json().catch(() => ({})),
    );
    if (!body.success) {
      return withCors(request, Response.json({ error: "Invalid request body" }, { status: 400 }));
    }
    try {
      if (body.data.generate) {
        const result = await queueOpportunityAndGenerate(oppId, userId);
        return withCors(request, Response.json(result));
      }
      const result = await queueOpportunityToStrategy(oppId, userId);
      return withCors(request, Response.json(result));
    } catch (err) {
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Queue failed" },
          { status: 502 },
        ),
      );
    }
  }

  const keywordOppBriefMatch = path.match(/^\/api\/keyword-opportunities\/(\d+)\/brief$/);
  if (keywordOppBriefMatch && request.method === "GET") {
    const oppId = Number.parseInt(keywordOppBriefMatch[1]!, 10);
    const [opp] = await db
      .select()
      .from(keywordOpportunitiesTable)
      .where(eq(keywordOpportunitiesTable.id, oppId))
      .limit(1);
    if (!opp) {
      return withCors(request, Response.json({ error: "Opportunity not found" }, { status: 404 }));
    }
    const project = await getAccessibleProject(opp.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    try {
      const brief = await buildBriefFromOpportunity(oppId);
      return withCors(request, Response.json({ brief }));
    } catch (err) {
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Brief generation failed" },
          { status: 502 },
        ),
      );
    }
  }

  if (keywordOppQueueMatch && request.method === "PATCH") {
    const oppId = Number.parseInt(keywordOppQueueMatch[1]!, 10);
    const parsed = z.object({ status: z.enum(["open", "queued", "dismissed"]) }).safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }
    const [opp] = await db
      .select()
      .from(keywordOpportunitiesTable)
      .where(eq(keywordOpportunitiesTable.id, oppId))
      .limit(1);
    if (!opp) {
      return withCors(request, Response.json({ error: "Opportunity not found" }, { status: 404 }));
    }
    const project = await getAccessibleProject(opp.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const [updated] = await db
      .update(keywordOpportunitiesTable)
      .set({ status: parsed.data.status })
      .where(eq(keywordOpportunitiesTable.id, oppId))
      .returning();
    return withCors(request, Response.json(updated));
  }

  const articleIdeasMatch = path.match(/^\/api\/website-projects\/(\d+)\/article-ideas$/);
  if (articleIdeasMatch && request.method === "POST") {
    const forbidden = await requireImportSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const projectId = Number.parseInt(articleIdeasMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const parsed = ManualBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request body" }, { status: 400 }));
    }

    const rows =
      "ideas" in parsed.data
        ? parsed.data.ideas.map((idea) => ({
            keyword: idea.keyword,
            suggestedTitle: idea.suggestedTitle,
            suggestedAngle: idea.suggestedAngle ?? "",
            estimatedVolume: idea.estimatedVolume,
            intent: idea.intent,
            difficulty: idea.difficulty,
          }))
        : [
            {
              keyword: parsed.data.keyword,
              suggestedTitle: parsed.data.suggestedTitle,
              suggestedAngle: parsed.data.suggestedAngle ?? "",
              estimatedVolume: parsed.data.estimatedVolume,
              intent: parsed.data.intent,
              difficulty: parsed.data.difficulty,
            },
          ];

    const result = await insertArticleIdeas({
      projectId,
      userId,
      rows,
      source: "manual",
    });
    return withCors(request, Response.json(result));
  }

  const articleImportMatch = path.match(/^\/api\/website-projects\/(\d+)\/article-ideas\/import$/);
  if (articleImportMatch && request.method === "POST") {
    const forbidden = await requireImportSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const projectId = Number.parseInt(articleImportMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const limited = await rateLimitResponse(
      `csv-import:${userId}`,
      RATE_LIMITS.CSV_IMPORT_PER_USER.limit,
      RATE_LIMITS.CSV_IMPORT_PER_USER.windowMs,
    );
    if (limited) return withCors(request, limited);

    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return withCors(request, Response.json({ error: "CSV file is required" }, { status: 400 }));
    }

    const text = await file.text();
    const sizeError = validateCsvUpload({
      byteLength: new TextEncoder().encode(text).byteLength,
      rowCount: text.split(/\r?\n/).filter((line) => line.trim().length > 0).length,
    });
    if (sizeError) {
      return withCors(request, Response.json({ error: sizeError }, { status: 400 }));
    }

    const parsed = parseCsvText(text);
    if (parsed.length === 0) {
      return withCors(request, Response.json({ error: "CSV file is empty" }, { status: 400 }));
    }

    const headerMapping = mapCsvHeaders(parsed[0]!.map((cell) => String(cell ?? "")));
    const validated = validateArticleIdeaRows(parsed, headerMapping);
    const validRows = validated.flatMap((row) =>
      row.errors.length === 0
        ? [
            {
              keyword: row.keyword,
              suggestedTitle: row.suggestedTitle,
              suggestedAngle: row.suggestedAngle,
              estimatedVolume: row.estimatedVolume,
              intent: row.intent,
              difficulty: row.difficulty,
            },
          ]
        : [],
    );

    const result = await insertArticleIdeas({
      projectId,
      userId,
      rows: validRows,
      source: "csv_import",
      dryRun,
    });
    return withCors(request, Response.json(result));
  }

  const articleSourcesMatch = path.match(/^\/api\/website-projects\/(\d+)\/article-idea-sources$/);
  if (articleSourcesMatch && request.method === "POST") {
    const forbidden = await requireImportSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const projectId = Number.parseInt(articleSourcesMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const parsed = CreateSheetSourceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request body" }, { status: 400 }));
    }

    let spreadsheet: { spreadsheetId: string; gid?: string };
    try {
      spreadsheet = parseSheetUrlOrId(parsed.data.spreadsheetUrl);
    } catch (err) {
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Invalid spreadsheet URL" },
          { status: 400 },
        ),
      );
    }

    const [created] = await db
      .insert(articleIdeaSourcesTable)
      .values({
        projectId,
        type: "google_sheets",
        label: parsed.data.label,
        spreadsheetId: spreadsheet.spreadsheetId,
        sheetName: parsed.data.sheetName ?? null,
        sheetGid: parsed.data.sheetGid ?? spreadsheet.gid ?? null,
        columnMapping: parsed.data.columnMapping ?? null,
        syncStatus: "idle",
      })
      .returning();

    return withCors(
      request,
      Response.json({
        source: created,
        connectUrl: `/api/auth/google-sheets?projectId=${projectId}&sourceId=${created!.id}`,
      }),
    );
  }

  if (articleSourcesMatch && request.method === "DELETE") {
    const forbidden = await requireImportSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const projectId = Number.parseInt(articleSourcesMatch[1]!, 10);
    const sourceId = Number.parseInt(new URL(request.url).searchParams.get("sourceId") ?? "", 10);
    if (!Number.isFinite(sourceId)) {
      return withCors(request, Response.json({ error: "sourceId is required" }, { status: 400 }));
    }

    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    await db
      .delete(articleIdeaSourcesTable)
      .where(
        and(
          eq(articleIdeaSourcesTable.id, sourceId),
          eq(articleIdeaSourcesTable.projectId, projectId),
        ),
      );

    return withCors(request, Response.json({ ok: true }));
  }

  const articleSourcesSyncMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/article-idea-sources\/sync$/,
  );
  if (articleSourcesSyncMatch && request.method === "POST") {
    const forbidden = await requireImportSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const projectId = Number.parseInt(articleSourcesSyncMatch[1]!, 10);
    const body = await request.json().catch(() => ({}));
    const sourceId = Number((body as { sourceId?: number }).sourceId);
    if (!Number.isFinite(sourceId)) {
      return withCors(request, Response.json({ error: "sourceId is required" }, { status: 400 }));
    }

    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [source] = await db
      .select()
      .from(articleIdeaSourcesTable)
      .where(
        and(
          eq(articleIdeaSourcesTable.id, sourceId),
          eq(articleIdeaSourcesTable.projectId, projectId),
        ),
      )
      .limit(1);

    if (!source) {
      return withCors(request, Response.json({ error: "Source not found" }, { status: 404 }));
    }

    if (!source.encryptedConfig) {
      return withCors(
        request,
        Response.json(
          {
            error: "Connect Google account first",
            connectUrl: `/api/auth/google-sheets?projectId=${projectId}&sourceId=${sourceId}`,
          },
          { status: 400 },
        ),
      );
    }

    try {
      const inserted = await syncArticleIdeaSource(sourceId, userId);
      return withCors(request, Response.json({ inserted }));
    } catch (err) {
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Sync failed" },
          { status: 502 },
        ),
      );
    }
  }

  const alertMatch = path.match(/^\/api\/keyword-rank-alerts\/(\d+)$/);
  if (alertMatch && request.method === "PATCH") {
    const alertId = Number.parseInt(alertMatch[1]!, 10);
    const parsed = UpdateAlertBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    const [alert] = await db
      .select()
      .from(keywordRankAlertsTable)
      .where(eq(keywordRankAlertsTable.id, alertId))
      .limit(1);

    if (!alert) {
      return withCors(request, Response.json({ error: "Alert not found" }, { status: 404 }));
    }

    const access = await requireProjectAccess(alert.websiteProjectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const [updated] = await db
      .update(keywordRankAlertsTable)
      .set({ status: parsed.data.status })
      .where(eq(keywordRankAlertsTable.id, alertId))
      .returning();

    return withCors(request, Response.json(updated));
  }

  const clusterMatch = path.match(/^\/api\/website-projects\/(\d+)\/keyword-clusters$/);
  if (clusterMatch && request.method === "POST") {
    const projectId = Number.parseInt(clusterMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const body = z
      .object({ seeds: z.array(z.string().min(1).max(200)).min(1).max(10) })
      .safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return withCors(request, Response.json({ error: "Provide 1–10 seed keywords" }, { status: 400 }));
    }

    const { prepareAiBilling, completeAiBilling, cancelAiBilling } = await import("./ai-billing");
    const billingPrep = await prepareAiBilling({
      userId,
      tier: "planning",
      quotaKind: "article",
    });
    if (!billingPrep.ok) return withCors(request, billingPrep.response);

    try {
      const { buildKeywordClusters } = await import(
        "@workspace/content-engine/strategy/keyword-cluster-service"
      );
      const result = await buildKeywordClusters({
        projectId,
        userId,
        seeds: body.data.seeds,
      });
      await completeAiBilling(billingPrep.ctx, {
        userId,
        eventType: "keyword_cluster",
        usedByok: billingPrep.usedByok,
        tier: "planning",
        promptTokens: result.generationUsage?.promptTokens,
        outputTokens: result.generationUsage?.outputTokens,
        totalTokens: result.generationUsage?.totalTokens,
      });
      return withCors(request, Response.json(result));
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx, "error");
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Cluster generation failed" },
          { status: 502 },
        ),
      );
    }
  }

  return null;
}
