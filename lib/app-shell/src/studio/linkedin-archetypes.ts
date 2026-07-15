export type LinkedInArchetypeId =
  | "listicle"
  | "case-study"
  | "hot-take"
  | "personal-story"
  | "educational";

export type LinkedInHookId =
  | "bold-question"
  | "contrarian-take"
  | "surprising-stat"
  | "personal-confession"
  | "controversial";

export const LINKEDIN_ARCHETYPES: ReadonlyArray<{
  id: LinkedInArchetypeId;
  label: string;
  description: string;
}> = [
  { id: "listicle", label: "Listicle", description: "Numbered insights" },
  { id: "case-study", label: "Mini Case Study", description: "Client or success story" },
  { id: "hot-take", label: "Hot Take", description: "Contrarian viewpoint" },
  { id: "personal-story", label: "Personal Story", description: "Journey or confession" },
  { id: "educational", label: "Educational", description: "How-to insight" },
];

export const LINKEDIN_HOOK_TYPES: ReadonlyArray<{
  id: LinkedInHookId;
  label: string;
  template: string;
}> = [
  { id: "bold-question", label: "Bold Question", template: "What if [statement]?" },
  {
    id: "contrarian-take",
    label: "Contrarian Take",
    template: "Most [audience] get [topic] wrong.",
  },
  {
    id: "surprising-stat",
    label: "Surprising Stat",
    template: "83% of [audience] fail because of [reason].",
  },
  {
    id: "personal-confession",
    label: "Personal Confession",
    template: "I used to do X. Here's why I stopped.",
  },
  { id: "controversial", label: "Controversial", template: "Hot take: [statement]" },
];

const ARCHETYPE_IDS = new Set<string>(LINKEDIN_ARCHETYPES.map((a) => a.id));
const HOOK_IDS = new Set<string>(LINKEDIN_HOOK_TYPES.map((h) => h.id));

/** Parse `archetype:id|…` from a LinkedIn angle hint string. */
export function parseLinkedInArchetypeFromAngleHint(
  angleHint: string | undefined | null,
): LinkedInArchetypeId | "" {
  if (!angleHint) return "";
  for (const part of angleHint.split("|")) {
    if (!part.startsWith("archetype:")) continue;
    const id = part.slice("archetype:".length).trim();
    if (ARCHETYPE_IDS.has(id)) return id as LinkedInArchetypeId;
  }
  return "";
}

/** Parse `hook:id|…` from a LinkedIn angle hint string. */
export function parseLinkedInHookFromAngleHint(
  angleHint: string | undefined | null,
): LinkedInHookId | "" {
  if (!angleHint) return "";
  for (const part of angleHint.split("|")) {
    if (!part.startsWith("hook:")) continue;
    const id = part.slice("hook:".length).trim();
    if (HOOK_IDS.has(id)) return id as LinkedInHookId;
  }
  return "";
}

/** Strip structured LinkedIn prefixes; leftover free-text notes only. */
export function stripLinkedInAngleMeta(angleHint: string | undefined | null): string {
  if (!angleHint) return "";
  const freeParts: string[] = [];
  for (const part of angleHint.split("|")) {
    if (part.startsWith("archetype:") || part.startsWith("hook:")) continue;
    const trimmed = part.trim();
    if (trimmed) freeParts.push(trimmed);
  }
  return freeParts.join("|");
}

export function buildLinkedInAngleHint(
  archetype: LinkedInArchetypeId | "",
  hook: LinkedInHookId | "",
  freeText: string,
): string | undefined {
  const notes = freeText.trim();
  if (!archetype && !hook && !notes) return undefined;
  return `archetype:${archetype || ""}|hook:${hook || ""}|${notes}`;
}
