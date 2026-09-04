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
  /** Prose word count used for soft-tell density scoring. New field, safe to ignore. */
  wordCount?: number;
  /** Hard tells (per-occurrence) vs soft tells (density-scored) that made up `score`. New field. */
  tierBreakdown?: {
    hard: number;
    soft: number;
    /** Aggregate soft-tell occurrences per 1,000 prose words. */
    softDensityPer1000: number;
  };
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

/**
 * HARD tells score full weight per occurrence, regardless of document length: they are
 * multi-word AI-isms (or a single-word/context match narrow enough to be unambiguous, like
 * the metaphorical "navigate"/"landscape" below) that are essentially never legitimate prose.
 *
 * SOFT tells are ordinary words that are perfectly fine in moderation ("the API's capabilities",
 * "optimize the query", one "ultimately" in a long piece) and only read as AI-ish at unnatural
 * density. They are scored per 1,000 prose words in computeSoftTellScore, not per occurrence.
 */
type TellTier = "hard" | "soft";

type TellPattern = { pattern: RegExp; tier: TellTier };

function hard(pattern: RegExp): TellPattern {
  return { pattern, tier: "hard" };
}

function soft(pattern: RegExp): TellPattern {
  return { pattern, tier: "soft" };
}

const AI_TELL_PATTERNS: Record<AiTellCategory, TellPattern[]> = {
  generic_opener: [
    hard(/\bin today'?s fast[- ]paced world\b/gi),
    hard(/\bas technology continues to evolve\b/gi),
    hard(/\bin the ever[- ]evolving landscape\b/gi),
    hard(/\bin an era of\b/gi),
    hard(/\bit'?s important to note\b/gi),
    hard(/\bit'?s worth mentioning\b/gi),
    hard(/\blet'?s delve into\b/gi),
  ],
  hedging: [
    hard(/\bit depends\b/gi),
    hard(/\bin many cases\b/gi),
    hard(/\bgenerally speaking\b/gi),
    // Single word, fine in small doses ("this could potentially work").
    soft(/\bpotentially\b/gi),
    hard(/\bmay have drawbacks\b/gi),
    hard(/\bin certain contexts\b/gi),
    hard(/\bcan be (?:beneficial|useful|effective)\b/gi),
  ],
  abstract_noun: [
    // Bare "landscape" is routine outside metaphor use ("landscape photography", "landscape
    // mode"). Only count it when a metaphor-signalling adjective sits nearby, or in "the
    // landscape of X" (those constructions are essentially always the AI cliche).
    hard(/\b(?:digital|business|competitive|evolving|changing|marketing|current)\b(?:\s+\w+){0,2}\s+landscape\b/gi),
    hard(/\bthe\s+landscape\s+of\b/gi),
    // Legitimate technical/academic terms in moderation ("the plugin ecosystem", "our testing
    // methodology"); only a tell at unnatural density.
    soft(/\becosystem\b/gi),
    soft(/\bparadigm\b/gi),
    soft(/\bmethodology\b/gi),
    soft(/\bsynergy\b/gi),
    // "the API's capabilities" is normal technical writing.
    soft(/\bcapabilit(?:y|ies)\b/gi),
  ],
  corporate_verb: [
    soft(/\bleverage\b/gi),
    soft(/\boptimize\b/gi),
    soft(/\bstreamline\b/gi),
    soft(/\bempower\b/gi),
    soft(/\brevolutionize\b/gi),
    soft(/\bfacilitate\b/gi),
    soft(/\bunlock\b/gi),
    soft(/\belevate\b/gi),
    soft(/\bfoster\b/gi),
    soft(/\bunderscore\b/gi),
    // "navigate to Settings" is a literal UI instruction. Only the metaphorical use (navigate
    // + an abstract object) reads as AI-ish, and that construction is unambiguous enough to
    // score full weight per occurrence.
    hard(
      /\bnavigat(?:e|es|ed|ing)\s+(?:the\s+|this\s+|these\s+|your\s+)?(?:complexit(?:y|ies)|challenges?|nuances?|intricac(?:y|ies)|uncertaint(?:y|ies)|landscape|waters|maze|terrain)\b/gi,
    ),
  ],
  formulaic_structure: [
    hard(/\bwhether you'?re a\b/gi),
    hard(/\bit'?s not just .+, it'?s .+\b/gi),
    hard(/\b(?:step|tip|thing) \d+ of \d+\b/gi),
  ],
  manufactured_balance: [
    hard(
      /\b(?:improves|reduces|enhances|increases|decreases|boosts|drives), .+, and (?:improves|reduces|enhances|increases|decreases|boosts|drives)\b/gi,
    ),
    hard(/\b(?:X, Y, and Z|efficiency, .+, and productivity)\b/gi),
  ],
  predictable_closer: [
    hard(/\bin conclusion\b/gi),
    hard(/\bto sum up\b/gi),
    hard(/\ball things considered\b/gi),
    // Fine once in a long article, a tell when it closes every other paragraph.
    soft(/\bultimately\b/gi),
    hard(/\bat the end of the day\b/gi),
    hard(/\bas we move forward\b/gi),
  ],
  ai_transition: [
    soft(/\bfurthermore\b/gi),
    soft(/\bmoreover\b/gi),
    soft(/\badditionally\b/gi),
    hard(/\bthat being said\b/gi),
    hard(/\bwith that in mind\b/gi),
    hard(/\bat its core\b/gi),
    hard(/\bin essence\b/gi),
  ],
  banned_word: [
    soft(/\bdelve\b/gi),
    soft(/\brobust\b/gi),
    soft(/\bseamless\b/gi),
    soft(/\bholistic\b/gi),
    // Two-word compound, rare as a literal claim rather than a cliche.
    hard(/\bgame[- ]changer\b/gi),
    soft(/\bpivotal\b/gi),
    soft(/\btransformative\b/gi),
    hard(/\bcutting[- ]edge\b/gi),
    soft(/\bcomprehensive\b/gi),
  ],
  over_formatting: [],
};

/**
 * Categories whose multi-word phrase patterns are safe to strip in post-LLM sanitize.
 * Single-token categories (corporate_verb, abstract_noun, banned_word) are intentionally
 * excluded — blind mid-sentence deletes of words like "optimize" wreck otherwise valid prose;
 * those tells belong to the LLM rewrite, not regex deletion.
 */
const SAFE_PHRASE_SANITIZE_CATEGORIES: AiTellCategory[] = [
  "generic_opener",
  "hedging",
  "formulaic_structure",
  "manufactured_balance",
  "predictable_closer",
  "ai_transition",
];

/** True when a pattern describes a multi-word phrase (two+ letter tokens), not a lone banned word. */
function isMultiWordPhrasePattern(pattern: RegExp): boolean {
  const rough = pattern.source
    .replace(/\\\w/g, " ")
    .replace(/\(\?:/g, " ")
    .replace(/[()[\]{}.*?+|^=$:\\/-]/g, " ");
  const tokens = rough.split(/\s+/).filter((token) => /[a-zA-Z]{2,}/.test(token));
  return tokens.length >= 2;
}

const AI_SLOP_PHRASE_PATTERNS: RegExp[] = SAFE_PHRASE_SANITIZE_CATEGORIES.flatMap((category) =>
  AI_TELL_PATTERNS[category].map((entry) => entry.pattern).filter(isMultiWordPhrasePattern),
);

function tidyAfterPhraseRemoval(text: string): string {
  let out = text;
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/ +\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  // Leftover " ," / " ." after phrase deletes
  out = out.replace(/\s+([,.;:!?])/g, "$1");
  out = out.replace(/([,.;:])\1+/g, "$1");
  out = out.replace(/,\s*,+/g, ", ");
  out = out.replace(/\(\s+/g, "(");
  out = out.replace(/\s+\)/g, ")");
  // Empty clause fragments: ", ," already handled; strip orphan commas at line starts
  out = out.replace(/(^|\n)\s*,\s*/g, "$1");
  return out.trim();
}

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

/**
 * Light cleanup of multi-word AI-tell phrases only (deterministic fallback after generation).
 * Do not extend this to single banned verbs/nouns — those are LLM rewrite territory.
 */
export function sanitizeAiSlopPhrases(text: string): string {
  let out = text;
  for (const pattern of AI_SLOP_PHRASE_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return tidyAfterPhraseRemoval(out);
}

export function sanitizeAiProse(text: string): string {
  return sanitizeAiSlopPhrases(sanitizeEmDashes(text));
}

export function countEmDashes(text: string): number {
  return (text.match(/[—–]/g) ?? []).length;
}

/**
 * Strip Markdown syntax (code fences, links, headings, list markers, emphasis) down to the
 * running prose, for word-count and phrase scoring. Shared by ai-writing-rules and
 * article-quality-score. Keep this the single implementation.
 */
export function stripMarkdownForProse(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countProseWords(text: string): number {
  const prose = stripMarkdownForProse(text);
  return prose.length === 0 ? 0 : prose.split(/\s+/).filter(Boolean).length;
}

/**
 * Soft tells are scored on density, not raw count, so a single "optimize" in a 1,500-word
 * article never scores. Two thresholds, both per 1,000 prose words:
 * - PER_TERM: any one soft word repeated past this rate reads as a tic (six "additionally"s
 *   in one article, not just one).
 * - TOTAL: even a spread of *different* soft words, in aggregate, reads as AI-flavored prose
 *   past this rate. Whichever threshold is breached harder decides the score, since both
 *   describe the same phenomenon (buzzword-heavy writing) and should not stack.
 */
const SOFT_TELL_PER_TERM_DENSITY_THRESHOLD = 2;
const SOFT_TELL_TOTAL_DENSITY_THRESHOLD = 6;

function computeSoftTellScore(
  occurrencesByPattern: number[],
  wordCount: number,
): { score: number; totalDensityPer1000: number } {
  if (wordCount === 0) return { score: 0, totalDensityPer1000: 0 };

  const perThousand = 1000 / wordCount;
  let perTermExcess = 0;
  let totalOccurrences = 0;
  for (const count of occurrencesByPattern) {
    totalOccurrences += count;
    const density = count * perThousand;
    if (density > SOFT_TELL_PER_TERM_DENSITY_THRESHOLD) {
      perTermExcess += Math.ceil(density - SOFT_TELL_PER_TERM_DENSITY_THRESHOLD);
    }
  }

  const totalDensityPer1000 = totalOccurrences * perThousand;
  const totalExcess =
    totalDensityPer1000 > SOFT_TELL_TOTAL_DENSITY_THRESHOLD
      ? Math.ceil(totalDensityPer1000 - SOFT_TELL_TOTAL_DENSITY_THRESHOLD)
      : 0;

  return { score: Math.max(perTermExcess, totalExcess), totalDensityPer1000 };
}

export function diagnoseAiTells(text: string): AiTellDiagnosis {
  const categories = {} as Record<AiTellCategory, string[]>;
  const wordCount = countProseWords(text);

  let hardCount = 0;
  const softOccurrencesByPattern: number[] = [];

  for (const [category, entries] of Object.entries(AI_TELL_PATTERNS) as [AiTellCategory, TellPattern[]][]) {
    const found = new Set<string>();
    for (const { pattern, tier } of entries) {
      const matches = extractMatches(text, pattern);
      for (const match of matches) found.add(match);
      if (tier === "hard") {
        hardCount += matches.length;
      } else {
        softOccurrencesByPattern.push(matches.length);
      }
    }
    categories[category] = [...found];
  }

  categories.over_formatting = countOverFormatting(text);
  hardCount += categories.over_formatting.length;

  const emDashCount = countEmDashes(text);
  const softTells = computeSoftTellScore(softOccurrencesByPattern, wordCount);

  const score = emDashCount + hardCount + softTells.score;

  return {
    score,
    categories,
    wordCount,
    tierBreakdown: {
      hard: emDashCount + hardCount,
      soft: softTells.score,
      softDensityPer1000: Math.round(softTells.totalDensityPer1000 * 100) / 100,
    },
  };
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
