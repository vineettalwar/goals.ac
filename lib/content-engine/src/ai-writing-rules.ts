/**
 * Shared anti-slop rules for AI content generation and post-processing.
 * Em dashes and formulaic phrasing are the most common AI tells in long-form output.
 */

export const AI_WRITING_RULES_PROMPT = `Anti-slop writing rules (mandatory):
- Do NOT use em dashes (—) or en dashes (–) anywhere in titles, headings, or body prose. Use commas, colons, parentheses, or split into two sentences instead.
- No AI-tell openers: "In today's fast-paced world", "In the ever-evolving landscape", "In an era of", "It's important to note", "Let's delve into".
- No AI-tell transitions as sentence openers: "Moreover", "Furthermore", "That being said", "With that in mind", "At its core", "In essence".
- No AI-tell closers: "In conclusion", "To sum up", "All things considered", "At the end of the day".
- Ban these words unless quoting a source: delve, leverage, unlock, elevate, robust, seamless, holistic, game-changer, landscape (as metaphor), navigate (metaphorically), foster, underscore, pivotal, transformative, cutting-edge, comprehensive (as filler).
- No rhetorical "Whether you're a X, Y, or Z" triads or formulaic "It's not just X, it's Y" patterns.
- Prefer plain, direct language. Vary sentence length. Use contractions where natural.`;

export const AI_WRITING_REWRITE_RULES_PROMPT = `${AI_WRITING_RULES_PROMPT}
- Replace every em dash and en dash in the draft with commas, colons, or separate sentences.
- Cut filler intensifiers (really, very, truly, essentially, absolutely) unless they add specific meaning.
- Rewrite any sentence that sounds like generic marketing copy or a press release.`;

const EM_DASH_PATTERN = /\s*[—–]\s*/g;

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

const AI_SLOP_PHRASES: RegExp[] = [
  /\bin today'?s fast[- ]paced world\b/gi,
  /\bin the ever[- ]evolving landscape\b/gi,
  /\bin an era of\b/gi,
  /\bit'?s important to note\b/gi,
  /\blet'?s delve into\b/gi,
  /\bin conclusion\b/gi,
  /\bto sum up\b/gi,
  /\bat the end of the day\b/gi,
  /\bfurthermore\b/gi,
  /\bmoreover\b/gi,
  /\bthat being said\b/gi,
  /\bgame[- ]changer\b/gi,
];

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

export function countAiSlopSignals(text: string): number {
  let count = countEmDashes(text);
  for (const pattern of AI_SLOP_PHRASES) {
    count += (text.match(pattern) ?? []).length;
  }
  return count;
}
