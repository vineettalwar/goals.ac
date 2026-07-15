/** Ordered list — single source for product/onboarding language pickers. */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" },
  { code: "pl", label: "Polish" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "tr", label: "Turkish" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "da", label: "Danish" },
  { code: "fi", label: "Finnish" },
  { code: "no", label: "Norwegian" },
  { code: "cs", label: "Czech" },
  { code: "ro", label: "Romanian" },
  { code: "hu", label: "Hungarian" },
  { code: "el", label: "Greek" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
  { code: "th", label: "Thai" },
  { code: "sk", label: "Slovak" },
  { code: "bg", label: "Bulgarian" },
  { code: "he", label: "Hebrew" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const LANGUAGE_LABELS: Record<string, string> = {
  ...Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l.label])),
  /** Legacy voice-edit saved `zh`; treat as Simplified. */
  zh: "Chinese (Simplified)",
};
/**
 * Language code → Semrush regional database.
 * Only maps to databases we allow in `@workspace/keyword-research-provider`.
 */
const LANGUAGE_TO_SEMRUSH_DB: Record<string, string> = {
  en: "us",
  "en-GB": "uk",
  de: "de",
  fr: "fr",
  es: "es",
  it: "it",
  pt: "br",
  nl: "nl",
  pl: "pl",
  ja: "jp",
  ko: "kr",
  "zh-CN": "cn",
  zh: "cn",
  "zh-TW": "tw",
  tr: "tr",
  ar: "ae",
  hi: "in",
  sv: "se",
  da: "dk",
  fi: "fi",
  no: "no",
  cs: "cz",
  ro: "ro",
  hu: "hu",
  el: "gr",
  id: "id",
  vi: "vn",
  th: "th",
  sk: "sk",
  bg: "bg",
  he: "il",
};

export function contentLanguageLabel(code: string | undefined): string {
  if (!code) return LANGUAGE_LABELS.en!;
  return LANGUAGE_LABELS[code] ?? LANGUAGE_LABELS.en!;
}

export function semrushDatabaseForLanguage(code: string | undefined): string | null {
  if (!code) return LANGUAGE_TO_SEMRUSH_DB.en ?? null;
  return LANGUAGE_TO_SEMRUSH_DB[code] ?? "us";
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
    nl: "Netherlands",
    pl: "Poland",
    jp: "Japan",
    kr: "South Korea",
    cn: "China",
    tw: "Taiwan",
    tr: "Turkey",
    ae: "United Arab Emirates",
    se: "Sweden",
    dk: "Denmark",
    fi: "Finland",
    no: "Norway",
    cz: "Czech Republic",
    ro: "Romania",
    hu: "Hungary",
    gr: "Greece",
    id: "Indonesia",
    vn: "Vietnam",
    th: "Thailand",
    sk: "Slovakia",
    bg: "Bulgaria",
    il: "Israel",
  };
  const db = database.trim().toLowerCase();
  const name = labels[db];
  return name ? `${name} (${db})` : db;
}
