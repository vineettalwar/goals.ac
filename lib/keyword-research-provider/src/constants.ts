export const SEMRUSH_DATABASES = [
  "us",
  "uk",
  "ca",
  "au",
  "de",
  "fr",
  "es",
  "it",
  "br",
  "in",
  "nl",
  "pl",
  "jp",
  "kr",
  "cn",
  "tw",
  "tr",
  "ae",
  "se",
  "dk",
  "fi",
  "no",
  "cz",
  "ro",
  "hu",
  "gr",
  "id",
  "vn",
  "th",
  "sk",
  "bg",
  "il",
] as const;

export type SemrushDatabase = (typeof SEMRUSH_DATABASES)[number];

export function isSemrushDatabase(value: string): value is SemrushDatabase {
  return (SEMRUSH_DATABASES as readonly string[]).includes(value.toLowerCase());
}
