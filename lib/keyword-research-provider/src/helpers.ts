import type { KeywordDifficultyLevel } from "./types";

export function extractDomain(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.toLowerCase() ?? trimmed;
  }
}

export function kdToDifficulty(kd: number): KeywordDifficultyLevel {
  if (kd < 40) return "low";
  if (kd <= 70) return "medium";
  return "high";
}

export function formatVolume(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0/mo";
  return `${n.toLocaleString("en-US")}/mo`;
}

/** Semrush legacy API uses lowercase db codes (us); v4 metrics API uses ISO country (US). */
export function databaseToCountryCode(database: string): string {
  const db = database.trim().toLowerCase();
  if (db === "uk") return "UK";
  return db.toUpperCase();
}

export function parseSemrushCsv(text: string): Record<string, string>[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = lines[0]!.split(";").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(";");
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key] = cols[i]?.trim() ?? "";
    });
    rows.push(row);
  }

  return rows;
}

export function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
