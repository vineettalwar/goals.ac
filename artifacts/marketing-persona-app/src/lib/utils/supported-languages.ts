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
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export function languageLabel(code: string | undefined): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? "English (US)";
}
