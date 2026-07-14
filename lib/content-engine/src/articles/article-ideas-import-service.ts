import { and, eq, inArray, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  articleIdeaImportsTable,
  articleIdeaSourcesTable,
  keywordOpportunitiesTable,
  type KeywordDifficultyLevel,
  type ArticleIdeaColumnMapping,
} from "@workspace/db/schema";
import type { GapOpportunity } from "@workspace/seo-tools/keywordGapAnalyzer";
import {
  encryptStoredTokens,
  fetchSheetValues,
  parseSpreadsheetUrl,
  parseStoredTokens,
  resolveAccessToken,
} from "../support/integrations/gsc-connection";
import { logger } from "../core/logger";
import {
  modelForProviderTier,
  resolveAiClient,
  resolveProviderId,
} from "@workspace/ai-providers";
import { getDecryptedUserGeminiKey } from "../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import {
  type ArticleIdeaRow,
  type ImportValidationRow,
  MAX_CSV_BYTES,
  MAX_CSV_ROWS,
  mapCsvHeaders,
  validateArticleIdeaRows,
  validateCsvUpload,
  parseCsvText,
} from "./article-ideas-csv";

export {
  type ArticleIdeaRow,
  type ImportValidationRow,
  MAX_CSV_BYTES,
  MAX_CSV_ROWS,
  mapCsvHeaders,
  validateArticleIdeaRows,
  validateCsvUpload,
  parseCsvText,
};

async function getExistingKeywords(projectId: number): Promise<Set<string>> {
  const existing = await db
    .select({ keyword: keywordOpportunitiesTable.keyword })
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, projectId),
        inArray(keywordOpportunitiesTable.status, ["open", "queued"]),
      ),
    );
  return new Set(existing.map((r) => r.keyword.toLowerCase()));
}

async function enrichMissingAnglesWithAi(
  rows: ArticleIdeaRow[],
  userId: number,
): Promise<ArticleIdeaRow[]> {
  const needsAngle = rows.filter((r) => r.keyword && r.suggestedTitle && !r.suggestedAngle.trim());
  if (needsAngle.length === 0) return rows;

  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);

  let client;
  try {
    client = await resolveAiClient(userApiKey, aiProviderOptions);
  } catch {
    return rows;
  }

  const batch = needsAngle.slice(0, 20);
  const prompt = `For each article idea below, write a 1-2 sentence content angle.
Return ONLY valid JSON array with objects: { "keyword": "...", "suggestedAngle": "..." }

Ideas:
${JSON.stringify(batch.map((r) => ({ keyword: r.keyword, title: r.suggestedTitle })))}`;

  try {
    const providerId = resolveProviderId(aiProviderOptions);
    const response = await client.generate({
      model: modelForProviderTier(providerId, "planning"),
      prompt,
      responseMimeType: "application/json",
      temperature: 0.4,
    });
    const parsed = JSON.parse(response.text ?? "[]") as Array<{
      keyword: string;
      suggestedAngle: string;
    }>;
    const byKeyword = new Map(parsed.map((p) => [p.keyword.toLowerCase(), p.suggestedAngle]));
    return rows.map((row) => ({
      ...row,
      suggestedAngle:
        row.suggestedAngle.trim() ||
        byKeyword.get(row.keyword.toLowerCase()) ||
        `Article targeting "${row.keyword}" for organic search.`,
    }));
  } catch (err) {
    logger.warn({ err }, "AI angle enrichment for imports failed");
    return rows;
  }
}

export async function insertArticleIdeas(params: {
  projectId: number;
  userId: number;
  rows: ArticleIdeaRow[];
  source: "manual" | "csv_import" | "google_sheets";
  fileName?: string;
  dryRun?: boolean;
}): Promise<{ inserted: number; skipped: number; errors: ImportValidationRow[] }> {
  const validation = params.rows.map((row, i) => {
    const errors: string[] = [];
    if (!row.keyword.trim()) errors.push("Missing keyword");
    if (!row.suggestedTitle.trim()) errors.push("Missing title");
    return { ...row, rowNumber: i + 1, errors };
  });

  const invalid = validation.filter((r) => r.errors.length > 0);
  if (params.dryRun) {
    return { inserted: validation.filter((r) => r.errors.length === 0).length, skipped: 0, errors: invalid };
  }

  const validRows = validation.filter((r) => r.errors.length === 0);
  const enrichedRows = await enrichMissingAnglesWithAi(
    validRows.map((r) => ({
      keyword: r.keyword,
      suggestedTitle: r.suggestedTitle,
      suggestedAngle: r.suggestedAngle,
      estimatedVolume: r.estimatedVolume,
      intent: r.intent,
      difficulty: r.difficulty,
    })),
    params.userId,
  );

  const existingKeywords = await getExistingKeywords(params.projectId);
  let inserted = 0;
  let skipped = 0;

  for (const row of enrichedRows) {
    const key = row.keyword.toLowerCase().trim();
    if (!key || existingKeywords.has(key)) {
      skipped += 1;
      continue;
    }
    existingKeywords.add(key);

    await db.insert(keywordOpportunitiesTable).values({
      websiteProjectId: params.projectId,
      keyword: row.keyword.trim(),
      source: params.source,
      estimatedVolume: row.estimatedVolume ?? null,
      difficulty: row.difficulty ?? null,
      opportunityScore: 50,
      intent: row.intent ?? null,
      suggestedTitle: row.suggestedTitle.trim(),
      suggestedAngle:
        row.suggestedAngle.trim() ||
        `Article targeting "${row.keyword.trim()}" for organic search.`,
      status: "open",
    });
    inserted += 1;
  }

  if (inserted > 0 || invalid.length > 0) {
    await db.insert(articleIdeaImportsTable).values({
      projectId: params.projectId,
      sourceType: params.source === "google_sheets" ? "google_sheets" : params.source === "csv_import" ? "csv" : "manual",
      fileName: params.fileName ?? null,
      rowCount: inserted,
      errorCount: invalid.length,
      importedByUserId: params.userId,
    });
  }

  return { inserted, skipped, errors: invalid };
}

export async function listArticleIdeaImports(projectId: number, limit = 10) {
  return db
    .select()
    .from(articleIdeaImportsTable)
    .where(eq(articleIdeaImportsTable.projectId, projectId))
    .orderBy(desc(articleIdeaImportsTable.createdAt))
    .limit(limit);
}

function normalizeSheetHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseSheetDifficulty(value: string | undefined): KeywordDifficultyLevel | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === "low" || lower === "medium" || lower === "high") return lower;
  return undefined;
}

function columnIndex(headers: string[], ...names: string[]): number {
  const normalized = headers.map((h) => normalizeSheetHeader(h));
  for (const name of names) {
    const idx = normalized.indexOf(normalizeSheetHeader(name));
    if (idx >= 0) return idx;
  }
  return -1;
}

function rowsFromSheetValues(
  values: string[][],
  mapping?: ArticleIdeaColumnMapping,
): ArticleIdeaRow[] {
  if (values.length === 0) return [];
  const headers = values[0]!.map((c) => String(c ?? ""));
  const keywordIdx = mapping?.keyword
    ? headers.findIndex((h) => normalizeSheetHeader(h) === normalizeSheetHeader(mapping.keyword!))
    : columnIndex(headers, "keyword", "query");
  const titleIdx = mapping?.title
    ? headers.findIndex((h) => normalizeSheetHeader(h) === normalizeSheetHeader(mapping.title!))
    : columnIndex(headers, "title", "suggestedTitle");
  const angleIdx = mapping?.angle
    ? headers.findIndex((h) => normalizeSheetHeader(h) === normalizeSheetHeader(mapping.angle!))
    : columnIndex(headers, "angle", "suggestedAngle", "topicAngle");
  const volumeIdx = mapping?.volume
    ? headers.findIndex((h) => normalizeSheetHeader(h) === normalizeSheetHeader(mapping.volume!))
    : columnIndex(headers, "volume", "estimatedVolume");
  const intentIdx = mapping?.intent
    ? headers.findIndex((h) => normalizeSheetHeader(h) === normalizeSheetHeader(mapping.intent!))
    : columnIndex(headers, "intent");
  const difficultyIdx = mapping?.difficulty
    ? headers.findIndex((h) => normalizeSheetHeader(h) === normalizeSheetHeader(mapping.difficulty!))
    : columnIndex(headers, "difficulty");

  const rows: ArticleIdeaRow[] = [];
  for (const row of values.slice(1)) {
    const keyword = keywordIdx >= 0 ? String(row[keywordIdx] ?? "").trim() : "";
    const title = titleIdx >= 0 ? String(row[titleIdx] ?? "").trim() : "";
    if (!keyword || !title) continue;
    rows.push({
      keyword,
      suggestedTitle: title,
      suggestedAngle:
        angleIdx >= 0 ? String(row[angleIdx] ?? "").trim() : "",
      estimatedVolume: volumeIdx >= 0 ? String(row[volumeIdx] ?? "").trim() || undefined : undefined,
      intent: intentIdx >= 0 ? String(row[intentIdx] ?? "").trim() || undefined : undefined,
      difficulty:
        difficultyIdx >= 0 ? parseSheetDifficulty(String(row[difficultyIdx] ?? "")) : undefined,
    });
  }
  return rows;
}

export async function syncArticleIdeaSource(sourceId: number, userId: number): Promise<number> {
  const [source] = await db
    .select()
    .from(articleIdeaSourcesTable)
    .where(eq(articleIdeaSourcesTable.id, sourceId))
    .limit(1);
  if (!source) throw new Error("Source not found");
  if (!source.encryptedConfig) throw new Error("Google account not connected for this source");

  await db
    .update(articleIdeaSourcesTable)
    .set({ syncStatus: "syncing", syncError: null })
    .where(eq(articleIdeaSourcesTable.id, sourceId));

  try {
    let tokens = parseStoredTokens(source.encryptedConfig);
    const resolved = await resolveAccessToken("google_search_console", tokens);
    tokens = resolved.tokens;

    if (resolved.refreshed) {
      await db
        .update(articleIdeaSourcesTable)
        .set({ encryptedConfig: encryptStoredTokens(tokens) })
        .where(eq(articleIdeaSourcesTable.id, sourceId));
    }

    const range = source.sheetName ? `'${source.sheetName}'!A:Z` : "A:Z";
    const values = await fetchSheetValues(resolved.accessToken, source.spreadsheetId, range);
    const rows = rowsFromSheetValues(values, source.columnMapping ?? undefined);

    const result = await insertArticleIdeas({
      projectId: source.projectId,
      userId,
      rows,
      source: "google_sheets",
      fileName: source.label,
    });

    await db
      .update(articleIdeaSourcesTable)
      .set({
        syncStatus: "ok",
        lastSyncedAt: new Date(),
        rowCount: result.inserted,
        syncError: null,
      })
      .where(eq(articleIdeaSourcesTable.id, sourceId));

    return result.inserted;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await db
      .update(articleIdeaSourcesTable)
      .set({ syncStatus: "error", syncError: message })
      .where(eq(articleIdeaSourcesTable.id, sourceId));
    logger.warn({ err, sourceId }, "Article idea source sync failed");
    throw err;
  }
}

export function parseSheetUrlOrId(input: string): { spreadsheetId: string; gid?: string } {
  const fromUrl = parseSpreadsheetUrl(input);
  if (fromUrl) return fromUrl;
  if (/^[a-zA-Z0-9-_]+$/.test(input.trim())) {
    return { spreadsheetId: input.trim() };
  }
  throw new Error("Invalid Google Sheets URL or spreadsheet ID");
}

export type { GapOpportunity };

