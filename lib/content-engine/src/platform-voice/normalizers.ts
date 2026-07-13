const LINKEDIN_ARTIFACTS = [
  /see more/gi,
  /…see more/gi,
  /\d+\s+likes?\s*·/gi,
  /like\s*·\s*comment/gi,
];

const TWITTER_ARTIFACTS = [
  /show this thread/gi,
  /\d+\s+retweets?/gi,
  /\d+\s+likes?/gi,
];

const GENERIC_ARTIFACTS = [
  /share\s*·\s*comment/gi,
  /follow\s+for\s+more/gi,
];

export function normalizeLinkedInText(text: string): string {
  let out = text.trim();
  for (const pattern of LINKEDIN_ARTIFACTS) {
    out = out.replace(pattern, "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function normalizeTwitterText(text: string): string {
  let out = text.trim();
  for (const pattern of TWITTER_ARTIFACTS) {
    out = out.replace(pattern, "");
  }
  return out.replace(/^\d+\/\s*/gm, "").trim();
}

export function normalizeGenericSocialText(text: string): string {
  let out = text.trim();
  for (const pattern of GENERIC_ARTIFACTS) {
    out = out.replace(pattern, "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function splitPasteBlocks(raw: string): string[] {
  const byDelimiter = raw
    .split(/\n---+\n|\n\n---\n\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 20);
  if (byDelimiter.length > 1) return byDelimiter;

  return raw
    .split(/\n{3,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 20);
}
