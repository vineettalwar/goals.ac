const LANGUAGE_LABELS: Record<string, string> = {
  en: "English (US)",
  "en-GB": "English (UK)",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  sv: "Swedish",
  pl: "Polish",
};

const LANGUAGE_TO_SEMRUSH_DB: Record<string, string> = {
  en: "us",
  "en-GB": "uk",
  de: "de",
  fr: "fr",
  es: "es",
  it: "it",
  pt: "br",
};

export function contentLanguageLabel(code: string | undefined): string {
  if (!code) return LANGUAGE_LABELS.en!;
  return LANGUAGE_LABELS[code] ?? LANGUAGE_LABELS.en!;
}

export function semrushDatabaseForLanguage(code: string | undefined): string | null {
  if (!code) return LANGUAGE_TO_SEMRUSH_DB.en ?? null;
  return LANGUAGE_TO_SEMRUSH_DB[code] ?? null;
}

export function isSemrushDatabaseMismatch(
  language: string | undefined,
  database: string,
): boolean {
  const suggested = semrushDatabaseForLanguage(language);
  if (!suggested) return false;
  return suggested !== database.trim().toLowerCase();
}

export function buildLanguagePromptLine(code: string | undefined): string {
  const normalized = code?.trim() || "en";
  if (normalized === "en") return "";

  const label = contentLanguageLabel(normalized);
  return `Content language: ${label} (${normalized}). Write suggestedTitle, suggestedAngle, suggestedContent, opportunities, topOpportunity, and summary in ${label}.`;
}

export function semrushDatabaseLabel(database: string): string {
  const labels: Record<string, string> = {
    us: "United States",
    uk: "United Kingdom",
    ca: "Canada",
    au: "Australia",
    de: "Germany",
    fr: "France",
    es: "Spain",
    it: "Italy",
    br: "Brazil",
    in: "India",
  };
  const db = database.trim().toLowerCase();
  const name = labels[db];
  return name ? `${name} (${db})` : db;
}
