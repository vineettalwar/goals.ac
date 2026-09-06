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
  exampleHook: string;
}> = [
  {
    id: "listicle",
    label: "Listicle",
    description: "Numbered insights",
    exampleHook: "3 things I learned about X...",
  },
  {
    id: "case-study",
    label: "Mini Case Study",
    description: "Client or success story",
    exampleHook: "Last week we helped a client Y...",
  },
  {
    id: "hot-take",
    label: "Hot Take",
    description: "Contrarian viewpoint",
    exampleHook: "Unpopular opinion: X is actually...",
  },
  {
    id: "personal-story",
    label: "Personal Story",
    description: "Journey or confession",
    exampleHook: "5 years ago I was X, then Y happened...",
  },
  {
    id: "educational",
    label: "Educational",
    description: "How-to insight",
    exampleHook: "Here's the exact framework we use for Y...",
  },
];

export const LINKEDIN_HOOK_TYPES: ReadonlyArray<{
  id: LinkedInHookId;
  label: string;
  template: string;
  strengthScore: number;
}> = [
  {
    id: "bold-question",
    label: "Bold Question",
    template: "What if [statement]?",
    strengthScore: 8,
  },
  {
    id: "contrarian-take",
    label: "Contrarian Take",
    template: "Most [audience] get [topic] wrong.",
    strengthScore: 9,
  },
  {
    id: "surprising-stat",
    label: "Surprising Stat",
    // Deliberately carries no number. An earlier version of this template read
    // "83% of [audience] fail because of [reason]." and was injected verbatim
    // into the generation prompt as a hook to imitate; the model reliably
    // copied the 83% figure as though it were real, because the template gave
    // it a specific, confident-sounding number and no signal that the number
    // was a placeholder rather than a fact. LinkedIn posts get none of the
    // citation or claim-attribution screening long-form articles do (see
    // isSeoLongformFormat), so a fabricated stat here goes straight to a
    // customer's own LinkedIn profile under their name with nothing to catch
    // it. Never reintroduce a specific invented number into this template.
    template: "Most [audience] get [topic] wrong, and the real reason surprised me.",
    strengthScore: 8,
  },
  {
    id: "personal-confession",
    label: "Personal Confession",
    template: "I used to do X. Here's why I stopped.",
    strengthScore: 6,
  },
  {
    id: "controversial",
    label: "Controversial",
    template: "Hot take: [statement]",
    strengthScore: 7,
  },
];

export const LINKEDIN_ARCHETYPE_STRUCTURES: Record<LinkedInArchetypeId, string> = {
  listicle:
    "- Opening hook\n- Brief context on why this matters\n- Numbered list of insights (3-7 items)\n- Brief explanation for each insight\n- Closing thought or question to engage readers",
  "case-study":
    "- Opening hook\n- Introduction to the client/challenge\n- The problem or situation faced\n- The solution implemented\n- Results and measurable outcomes\n- Lessons learned and closing insight",
  "hot-take":
    "- Opening hook that states the contrarian viewpoint\n- Explanation of why the common belief is wrong\n- Evidence or reasoning supporting your view\n- Who might disagree and why they're mistaken\n- Closing thought that reinforces your perspective",
  "personal-story":
    "- Opening hook that draws readers in\n- The beginning of your journey or situation\n- The challenge or turning point\n- How you overcame it or what you learned\n- Where you are now and what it means\n- Closing reflection or advice for others",
  educational:
    "- Opening hook that highlights the value of the knowledge\n- The problem or gap in understanding\n- The framework, method, or approach explained\n- How to apply it with concrete examples\n- Common mistakes to avoid\n- Closing summary and next steps",
};

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
