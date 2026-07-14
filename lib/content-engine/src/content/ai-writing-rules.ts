/**
 * Shared anti-slop rules for AI content generation and post-processing.
 * Aligned with the humanize-ai-writing skill: diagnose tells, subtract filler, add specificity.
 */

export type AiTellCategory =
  | "generic_opener"
  | "hedging"
  | "abstract_noun"
  | "corporate_verb"
  | "formulaic_structure"
  | "manufactured_balance"
  | "predictable_closer"
  | "ai_transition"
  | "banned_word"
  | "over_formatting";

export type AiTellDiagnosis = {
  score: number;
  categories: Record<AiTellCategory, string[]>;
};

export const AI_WRITING_RULES_PROMPT = `Anti-slop writing rules (mandatory):
- Do NOT use em dashes (—) or en dashes (–) anywhere in titles, headings, or body prose. Use commas, colons, parentheses, or split into two sentences instead.
- No AI-tell openers: "In today's fast-paced world", "As technology continues to evolve", "In the ever-evolving landscape", "In an era of", "It's important to note", "It's worth mentioning", "Let's delve into".
- No AI-tell transitions as sentence openers: "Moreover", "Furthermore", "Additionally", "That being said", "With that in mind", "At its core", "In essence".
- No AI-tell closers: "In conclusion", "To sum up", "All things considered", "Ultimately", "At the end of the day", "As we move forward".
- No hedging when you can commit: avoid "it depends", "in many cases", "generally speaking", "potentially", "may have drawbacks in certain contexts". Prefer direct claims: "this usually fails" beats "this may have drawbacks".
- Ban abstract noun fog unless quoting a source: landscape (as metaphor), ecosystem, paradigm, framework (as filler), methodology, capability (as filler), synergy, potential (as filler).
- Ban corporate verbs unless quoting: leverage, optimize, streamline, empower, revolutionize, facilitate, unlock, elevate, foster, underscore, navigate (metaphorically).
- Ban filler words unless quoting: delve, robust, seamless, holistic, game-changer, pivotal, transformative, cutting-edge, comprehensive (as filler).
- No rhetorical "Whether you're a X, Y, or Z" triads or formulaic "It's not just X, it's Y" patterns.
- No manufactured balance: tidy tricolons like "improves efficiency, reduces costs, and enhances productivity" unless each item is specific.
- Vary section length and shape. Not every section needs the same intro-explanation-summary arc.
- Prefer plain, direct language. Vary sentence length deliberately: mix short punchy sentences with longer ones. Use contractions where natural.
- Litmus test: if a sentence could appear verbatim in a thousand other articles, make it specific or cut it.`;

export const AI_WRITING_REWRITE_RULES_PROMPT = `${AI_WRITING_RULES_PROMPT}
- Work in two passes inside your rewrite: Pass 1 SUBTRACT (delete generic intros/closers, cut buzzwords, remove filler transitions, break uniform structure). Pass 2 ADD (concrete phrasing, committed claims, varied rhythm, brand voice).
- Replace every em dash and en dash in the draft with commas, colons, or separate sentences.
- Cut filler intensifiers (really, very, truly, essentially, absolutely) unless they add specific meaning.
- Rewrite any sentence that sounds like generic marketing copy or a press release.
- Never fabricate statistics, quotes, or anecdotes. Preserve existing facts and citations exactly.`;

export const AI_WRITING_FROM_SCRATCH_PROMPT = `Write-from-scratch human voice rules:
- Start on the actual point. No throat-clearing intro about "today's landscape".
- End on the last real thing you have to say. No "In conclusion" wrapper.
- Be specific: real numbers, named examples, concrete behavior beats "various use cases".
- Commit to opinions where the topic allows. Take a stance instead of hedging.
- Mix sentence lengths on purpose. A long sentence that builds a thought, then a short one.
- Do not invent facts, stats, or personal anecdotes. Use only what brand context and research provide.`;

const EM_DASH_PATTERN = /\s*[—–]\s*/g;

const AI_TELL_PATTERNS: Record<AiTellCategory, RegExp[]> = {
  generic_opener: [
    /\bin today'?s fast[- ]paced world\b/gi,
    /\bas technology continues to evolve\b/gi,
    /\bin the ever[- ]evolving landscape\b/gi,
    /\bin an era of\b/gi,
    /\bit'?s important to note\b/gi,
    /\bit'?s worth mentioning\b/gi,
    /\blet'?s delve into\b/gi,
  ],
  hedging: [
    /\bit depends\b/gi,
    /\bin many cases\b/gi,
    /\bgenerally speaking\b/gi,
    /\bpotentially\b/gi,
    /\bmay have drawbacks\b/gi,
    /\bin certain contexts\b/gi,
    /\bcan be (?:beneficial|useful|effective)\b/gi,
  ],
  abstract_noun: [
    /\b(?:the )?(?:digital |business )?landscape\b/gi,
    /\becosystem\b/gi,
    /\bparadigm\b/gi,
    /\bmethodology\b/gi,
    /\bsynergy\b/gi,
    /\bcapabilit(?:y|ies)\b/gi,
  ],
  corporate_verb: [
    /\bleverage\b/gi,
    /\boptimize\b/gi,
    /\bstreamline\b/gi,
    /\bempower\b/gi,
    /\brevolutionize\b/gi,
    /\bfacilitate\b/gi,
    /\bunlock\b/gi,
    /\belevate\b/gi,
    /\bfoster\b/gi,
    /\bunderscore\b/gi,
    /\bnavigate\b/gi,
  ],
  formulaic_structure: [
    /\bwhether you'?re a\b/gi,
    /\bit'?s not just .+, it'?s .+\b/gi,
    /\b(?:step|tip|thing) \d+ of \d+\b/gi,
  ],
  manufactured_balance: [
    /\b(?:improves|reduces|enhances|increases|decreases|boosts|drives), .+, and (?:improves|reduces|enhances|increases|decreases|boosts|drives)\b/gi,
    /\b(?:X, Y, and Z|efficiency, .+, and productivity)\b/gi,
  ],
  predictable_closer: [
    /\bin conclusion\b/gi,
    /\bto sum up\b/gi,
    /\ball things considered\b/gi,
    /\bultimately\b/gi,
    /\bat the end of the day\b/gi,
    /\bas we move forward\b/gi,
  ],
  ai_transition: [
    /\bfurthermore\b/gi,
    /\bmoreover\b/gi,
    /\badditionally\b/gi,
    /\bthat being said\b/gi,
    /\bwith that in mind\b/gi,
    /\bat its core\b/gi,
    /\bin essence\b/gi,
  ],
  banned_word: [
    /\bdelve\b/gi,
    /\brobust\b/gi,
    /\bseamless\b/gi,
    /\bholistic\b/gi,
    /\bgame[- ]changer\b/gi,
    /\bpivotal\b/gi,
    /\btransformative\b/gi,
    /\bcutting[- ]edge\b/gi,
    /\bcomprehensive\b/gi,
  ],
  over_formatting: [],
};

const AI_SLOP_PHRASES: RegExp[] = Object.values(AI_TELL_PATTERNS).flat();

function extractMatches(text: string, pattern: RegExp): string[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = globalPattern.exec(text)) !== null) {
    matches.push(match[0].trim());
  }
  return matches;
}

function countOverFormatting(text: string): string[] {
  const issues: string[] = [];
  const sections = text.split(/^## /gm).filter(Boolean);
  if (sections.length >= 3) {
    const bulletSections = sections.filter((section) => (section.match(/^[-*] /gm) ?? []).length >= 4);
    if (bulletSections.length >= Math.ceil(sections.length * 0.6)) {
      issues.push("Most sections are bullet-heavy lists");
    }
  }
  const listBlocks = text.match(/(?:^[-*] .+\n){4,}/gm) ?? [];
  for (const block of listBlocks.slice(0, 2)) {
    issues.push(`Long bullet block (${block.split("\n").length} items)`);
  }
  return issues;
}

/** Replace em/en dashes with comma separators and tidy punctuation artifacts. */
export function sanitizeEmDashes(text: string): string {
  if (!text.includes("—") && !text.includes("–")) return text;

  let out = text.replace(EM_DASH_PATTERN, ", ");
  out = out.replace(/,\s*,+/g, ", ");
  out = out.replace(/\(\s*,/g, "(");
  out = out.replace(/,\s*\)/g, ")");
  out = out.replace(/:\s*,/g, ": ");
  return out;
}

/** Light cleanup of the worst AI-tell phrases (deterministic fallback after generation). */
export function sanitizeAiSlopPhrases(text: string): string {
  let out = text;
  for (const pattern of AI_SLOP_PHRASES) {
    out = out.replace(pattern, "");
  }
  return out.replace(/  +/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function sanitizeAiProse(text: string): string {
  return sanitizeAiSlopPhrases(sanitizeEmDashes(text));
}

export function countEmDashes(text: string): number {
  return (text.match(/[—–]/g) ?? []).length;
}

export function diagnoseAiTells(text: string): AiTellDiagnosis {
  const categories = {} as Record<AiTellCategory, string[]>;

  for (const [category, patterns] of Object.entries(AI_TELL_PATTERNS) as [AiTellCategory, RegExp[]][]) {
    const found = new Set<string>();
    for (const pattern of patterns) {
      for (const match of extractMatches(text, pattern)) {
        found.add(match);
      }
    }
    categories[category] = [...found];
  }

  categories.over_formatting = countOverFormatting(text);

  const score =
    countEmDashes(text) +
    Object.values(categories).reduce((sum, examples) => sum + examples.length, 0);

  return { score, categories };
}

export function formatAiTellDiagnosisSummary(diagnosis: AiTellDiagnosis, maxExamples = 5): string {
  if (diagnosis.score === 0) return "";

  const examples: string[] = [];
  for (const [category, matches] of Object.entries(diagnosis.categories) as [AiTellCategory, string[]][]) {
    for (const match of matches) {
      examples.push(`[${category}] "${match}"`);
      if (examples.length >= maxExamples) break;
    }
    if (examples.length >= maxExamples) break;
  }

  return `Detected AI tells (score ${diagnosis.score}):\n${examples.join("\n")}`;
}

export function countAiSlopSignals(text: string): number {
  return diagnoseAiTells(text).score;
}
