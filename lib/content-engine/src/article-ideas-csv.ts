import type { KeywordDifficultyLevel } from "@workspace/db/schema";

export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_CSV_ROWS = 2000;

export type ArticleIdeaRow = {
  keyword: string;
  suggestedTitle: string;
  suggestedAngle: string;
  estimatedVolume?: string;
  intent?: string;
  difficulty?: KeywordDifficultyLevel;
};

export type ImportValidationRow = ArticleIdeaRow & {
  rowNumber: number;
  errors: string[];
};

const HEADER_ALIASES: Record<string, keyof ArticleIdeaRow> = {
  keyword: "keyword",
  keywords: "keyword",
  query: "keyword",
  title: "suggestedTitle",
  suggestedtitle: "suggestedTitle",
  articletitle: "suggestedTitle",
  angle: "suggestedAngle",
  suggestedangle: "suggestedAngle",
  topicangle: "suggestedAngle",
  volume: "estimatedVolume",
  estimatedvolume: "estimatedVolume",
  searchvolume: "estimatedVolume",
  intent: "intent",
  searchintent: "intent",
  difficulty: "difficulty",
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseDifficulty(value: string | undefined): KeywordDifficultyLevel | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === "low" || lower === "medium" || lower === "high") return lower;
  return undefined;
}

export function mapCsvHeaders(headers: string[]): Record<number, keyof ArticleIdeaRow> {
  const mapping: Record<number, keyof ArticleIdeaRow> = {};
  headers.forEach((header, index) => {
    const field = HEADER_ALIASES[normalizeHeader(header)];
    if (field) mapping[index] = field;
  });
  return mapping;
}

export function validateArticleIdeaRows(
  rows: string[][],
  headerMapping?: Record<number, keyof ArticleIdeaRow>,
): ImportValidationRow[] {
  if (rows.length === 0) return [];

  const hasHeader = headerMapping != null;
  const mapping =
    headerMapping ??
    mapCsvHeaders(rows[0]!.map((cell) => String(cell ?? "")));

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const results: ImportValidationRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] ?? [];
    const rowNumber = hasHeader ? i + 2 : i + 1;
    const parsed: Partial<ArticleIdeaRow> = {};
    const errors: string[] = [];

    for (const [indexStr, field] of Object.entries(mapping)) {
      const index = Number(indexStr);
      const value = String(row[index] ?? "").trim();
      if (!value) continue;
      if (field === "difficulty") {
        const d = parseDifficulty(value);
        if (d) parsed.difficulty = d;
        else errors.push(`Invalid difficulty "${value}"`);
      } else {
        (parsed as Record<string, string>)[field] = value;
      }
    }

    if (!parsed.keyword) errors.push("Missing keyword");
    if (!parsed.suggestedTitle) errors.push("Missing title");

    results.push({
      rowNumber,
      keyword: parsed.keyword ?? "",
      suggestedTitle: parsed.suggestedTitle ?? "",
      suggestedAngle: parsed.suggestedAngle ?? "",
      estimatedVolume: parsed.estimatedVolume,
      intent: parsed.intent,
      difficulty: parsed.difficulty,
      errors,
    });
  }

  return results;
}

export function validateCsvUpload(params: {
  byteLength: number;
  rowCount: number;
}): string | null {
  if (params.byteLength > MAX_CSV_BYTES) {
    return `CSV file exceeds ${MAX_CSV_BYTES / (1024 * 1024)}MB limit`;
  }
  if (params.rowCount > MAX_CSV_ROWS) {
    return `CSV exceeds ${MAX_CSV_ROWS} row limit`;
  }
  return null;
}

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
      if (char === "\r") i += 1;
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((c) => c.trim().length > 0)) rows.push(row);
  return rows;
}
