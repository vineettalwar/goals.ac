import type { OnboardingAnswers } from "@workspace/db/schema";

/**
 * Splits the `style_jargon` answer into preferred and forbidden vocabulary.
 *
 * The step asks for this in plain English, so the answer arrives however the
 * firm chose to write it. Labelled lists ("love: x, y | never: a, b", or the
 * same across two lines) are read as lists. Anything unlabelled is NOT guessed
 * at: these lists feed the generator as vocabulary, so a whole sentence parsed
 * as a "preferred word" would come back out inside articles. An unlabelled
 * answer is returned as `styleNote` instead, which the caller folds into the
 * voice guidance where free text belongs.
 *
 * Never throws: the worst case is everything landing in `styleNote`.
 */
export function parseJargonAnswer(raw: string): {
  doWords: string[];
  dontWords: string[];
  styleNote: string;
} {
  const empty = { doWords: [], dontWords: [], styleNote: "" };
  const text = raw.trim();
  if (!text) return empty;

  const LOVE_LABEL = /^(?:words?\s+)?(?:we\s+)?(?:love|like|use|prefer|say|yes)\b\s*:?\s*/i;
  const AVOID_LABEL = /^(?:words?\s+)?(?:we\s+)?(?:never|avoid|hate|dislike|ban|no|not)\b\s*:?\s*/i;

  const doWords: string[] = [];
  const dontWords: string[] = [];
  const unlabelled: string[] = [];

  for (const segment of text.split(/[|\n;]+/)) {
    const part = segment.trim();
    if (!part) continue;

    if (LOVE_LABEL.test(part)) {
      doWords.push(...splitWordList(part.replace(LOVE_LABEL, "")));
    } else if (AVOID_LABEL.test(part)) {
      dontWords.push(...splitWordList(part.replace(AVOID_LABEL, "")));
    } else {
      unlabelled.push(part);
    }
  }

  return {
    doWords,
    dontWords,
    styleNote: unlabelled.join(" ").trim(),
  };
}

/**
 * A vocabulary entry is a word or a short phrase. Anything longer is prose the
 * firm wrote around its list, and prose does not belong in a word list, so it
 * is dropped rather than passed to the generator as a term to favour.
 */
const MAX_VOCABULARY_WORDS = 4;

function splitWordList(part: string): string[] {
  return part
    .split(",")
    .map((word) => word.trim().replace(/^["']|["']$/g, ""))
    .filter((word) => word.length > 0 && word.split(/\s+/).length <= MAX_VOCABULARY_WORDS);
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

export type BrandProfileStyleFields = {
  voiceTone: string;
  competitorUrls: string[];
  doWords: string[];
  dontWords: string[];
  antiPatterns: string[];
};

/**
 * Folds the style questionnaire's answers into a patch for `brand_profiles`'
 * existing fields. Merges, never clobbers: `existing` is whatever the website
 * scan already produced (or the vertical preset default, for a profile that
 * does not exist yet), and every field here is that value extended, never
 * replaced. A firm that skipped the questionnaire entirely gets `existing`
 * back untouched. Nothing is written.
 *
 * - `stylePitch` seeds/extends `voiceTone`.
 * - `styleRivals` joins `competitorUrls`.
 * - `styleJargon` splits into `doWords` / `dontWords`; the forbidden half also
 *   folds into `antiPatterns`, phrased as a pattern rather than a bare word,
 *   since a word the firm never wants to see is itself a writing anti-pattern.
 */
export function applyStyleAnswersToBrandProfile(
  answers: OnboardingAnswers,
  existing: BrandProfileStyleFields,
): BrandProfileStyleFields {
  const { doWords: lovedWords, dontWords: avoidedWords, styleNote } = answers.styleJargon
    ? parseJargonAnswer(answers.styleJargon)
    : { doWords: [], dontWords: [], styleNote: "" };

  const pitch = answers.stylePitch?.trim();
  // An unlabelled jargon answer is voice guidance, so it joins the pitch rather
  // than being forced into a word list it does not fit.
  const additions = [pitch, styleNote].filter((part): part is string => Boolean(part));
  const voiceTone = additions.length
    ? [existing.voiceTone, ...additions].filter(Boolean).join("\n\n")
    : existing.voiceTone;

  const competitorUrls = dedupe([...existing.competitorUrls, ...(answers.styleRivals ?? [])]);

  const doWords = dedupe([...existing.doWords, ...lovedWords]);
  const dontWords = dedupe([...existing.dontWords, ...avoidedWords]);
  const antiPatterns = dedupe([...existing.antiPatterns, ...avoidedWords.map((w) => `Never use the word "${w}"`)]);

  return { voiceTone, competitorUrls, doWords, dontWords, antiPatterns };
}
