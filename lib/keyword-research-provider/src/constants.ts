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
  "tr",
  "ae",
] as const;

export type SemrushDatabase = (typeof SEMRUSH_DATABASES)[number];

export function isSemrushDatabase(value: string): value is SemrushDatabase {
  return (SEMRUSH_DATABASES as readonly string[]).includes(value.toLowerCase());
}
