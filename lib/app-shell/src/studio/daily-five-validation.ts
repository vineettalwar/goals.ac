export function parseSourceUrls(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter((part) => /^https?:\/\//i.test(part));
}

export function requiresSources(section: string): boolean {
  return section.trim().toLowerCase() === "news";
}

export function isDailyFiveItemValid(input: { section: string; sourceUrls: string }): boolean {
  if (!requiresSources(input.section)) return true;
  return parseSourceUrls(input.sourceUrls).length > 0;
}
