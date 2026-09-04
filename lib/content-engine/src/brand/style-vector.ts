/**
 * Deterministic, dependency-free measurement of writing style over a corpus
 * of scanned pages. No AI, no network calls. Produces a `StyleVector` that
 * downstream prompts can render into concrete instructions instead of
 * relying on a qualitative "voice tone" adjective.
 */

export type VocabularyTier = "plain" | "professional" | "technical";

export type StyleVector = {
  avgSentenceWords: number;
  sentenceLengthStdDev: number;
  avgParagraphSentences: number;
  longSentenceRatio: number;
  shortSentenceRatio: number;
  questionRatio: number;
  exclamationRatio: number;
  firstPersonRatio: number;
  secondPersonRatio: number;
  contractionRatio: number;
  avgWordLength: number;
  complexWordRatio: number;
  fleschReadingEase: number;
  readingGradeLevel: number;
  vocabularyTier: VocabularyTier;
  listUsageRatio: number;
  headingDensity: number;
  sampleWordCount: number;
  sampleDocumentCount: number;
  computedAt: string;
};

const LONG_SENTENCE_WORDS = 25;
const SHORT_SENTENCE_WORDS = 8;

const FIRST_PERSON_RE = /\b(i|we|our|us)\b/i;
const SECOND_PERSON_RE = /\b(you|your|yours)\b/i;
const LIST_LINE_RE = /^\s*(?:[-*•]|\d+[.)]|[a-z][.)])\s+\S/i;
const HEADING_MARKDOWN_RE = /^\s*#{1,6}\s+\S/;

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function emptyStyleVector(): StyleVector {
  return {
    avgSentenceWords: 0,
    sentenceLengthStdDev: 0,
    avgParagraphSentences: 0,
    longSentenceRatio: 0,
    shortSentenceRatio: 0,
    questionRatio: 0,
    exclamationRatio: 0,
    firstPersonRatio: 0,
    secondPersonRatio: 0,
    contractionRatio: 0,
    avgWordLength: 0,
    complexWordRatio: 0,
    fleschReadingEase: 0,
    readingGradeLevel: 0,
    vocabularyTier: "plain",
    listUsageRatio: 0,
    headingDensity: 0,
    sampleWordCount: 0,
    sampleDocumentCount: 0,
    computedAt: new Date().toISOString(),
  };
}

/** Splits raw text into sentences, keeping the terminal punctuation attached
 * so callers can inspect it for question/exclamation detection. */
function splitSentences(paragraph: string): string[] {
  const normalized = paragraph.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  if (!matches) return [];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

function splitParagraphs(text: string): string[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length > 0) return blocks;
  const single = text.trim();
  return single ? [single] : [];
}

function stripToLetters(word: string): string {
  return word.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, "");
}

/** Standard vowel-group syllable heuristic. A trailing silent `e` is
 * dropped before counting (unless it is the word's only vowel), and every
 * word resolves to at least one syllable. */
function countSyllables(rawWord: string): number {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;

  let stem = word;
  if (stem.length > 2 && stem.endsWith("e") && !stem.endsWith("le")) {
    stem = stem.slice(0, -1);
  }

  const groups = stem.match(/[aeiouy]+/g);
  const count = groups ? groups.length : 0;
  return count > 0 ? count : 1;
}

function wordsOf(sentence: string): string[] {
  return sentence.split(/\s+/).filter(Boolean);
}

/**
 * Vocabulary tier thresholds, derived from Flesch-Kincaid grade level and
 * the share of 3+ syllable words in the sample:
 *   - "technical": grade level >= 13, or complex-word ratio >= 0.22
 *   - "professional": grade level >= 9, or complex-word ratio >= 0.12
 *   - "plain": everything below that
 * Covered by the threshold tests in style-vector.test.ts.
 */
function classifyVocabularyTier(gradeLevel: number, complexWordRatio: number): VocabularyTier {
  if (gradeLevel >= 13 || complexWordRatio >= 0.22) return "technical";
  if (gradeLevel >= 9 || complexWordRatio >= 0.12) return "professional";
  return "plain";
}

export function computeStyleVector(docs: { text: string; title?: string }[]): StyleVector {
  const usableDocs = docs.filter((doc) => doc.text && doc.text.trim().length > 0);
  if (usableDocs.length === 0) return emptyStyleVector();

  const sentenceWordCounts: number[] = [];
  let paragraphCount = 0;
  let questionSentences = 0;
  let exclamationSentences = 0;
  let firstPersonSentences = 0;
  let secondPersonSentences = 0;
  let totalWords = 0;
  let totalLetterWords = 0;
  let totalWordLetters = 0;
  let totalSyllables = 0;
  let complexWords = 0;
  let contractionWords = 0;
  let listLines = 0;
  let headingLines = 0;
  let totalLines = 0;

  for (const doc of usableDocs) {
    const paragraphs = splitParagraphs(doc.text);
    paragraphCount += paragraphs.length;

    for (const paragraph of paragraphs) {
      const sentences = splitSentences(paragraph);
      for (const sentence of sentences) {
        const words = wordsOf(sentence);
        if (words.length === 0) continue;

        sentenceWordCounts.push(words.length);
        if (/\?\s*$/.test(sentence)) questionSentences += 1;
        if (/!\s*$/.test(sentence)) exclamationSentences += 1;
        if (FIRST_PERSON_RE.test(sentence)) firstPersonSentences += 1;
        if (SECOND_PERSON_RE.test(sentence)) secondPersonSentences += 1;

        for (const rawWord of words) {
          totalWords += 1;
          if (/'\w/.test(rawWord)) contractionWords += 1;

          const letters = stripToLetters(rawWord);
          if (!letters) continue;
          totalLetterWords += 1;
          totalWordLetters += letters.length;

          const syllables = countSyllables(letters);
          totalSyllables += syllables;
          if (syllables >= 3) complexWords += 1;
        }
      }
    }

    const lines = doc.text.split("\n").map((line) => line.trim());
    for (const line of lines) {
      if (!line) continue;
      totalLines += 1;
      if (LIST_LINE_RE.test(line)) {
        listLines += 1;
      } else if (HEADING_MARKDOWN_RE.test(line)) {
        headingLines += 1;
      } else if (wordsOf(line).length <= 8 && !/[.!?,;:]$/.test(line)) {
        headingLines += 1;
      }
    }
  }

  if (totalWords === 0 || sentenceWordCounts.length === 0) return emptyStyleVector();

  const sentenceCount = sentenceWordCounts.length;
  const avgSentenceWords = sentenceWordCounts.reduce((sum, n) => sum + n, 0) / sentenceCount;
  const variance =
    sentenceWordCounts.reduce((sum, n) => sum + (n - avgSentenceWords) ** 2, 0) / sentenceCount;
  const sentenceLengthStdDev = Math.sqrt(variance);

  const longSentences = sentenceWordCounts.filter((n) => n > LONG_SENTENCE_WORDS).length;
  const shortSentences = sentenceWordCounts.filter((n) => n <= SHORT_SENTENCE_WORDS).length;

  const avgWordLength = totalLetterWords > 0 ? totalWordLetters / totalLetterWords : 0;
  const wordsPerSentence = avgSentenceWords;
  const syllablesPerWord = totalLetterWords > 0 ? totalSyllables / totalLetterWords : 0;

  const fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const readingGradeLevel = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  const complexWordRatio = totalLetterWords > 0 ? complexWords / totalLetterWords : 0;

  return {
    avgSentenceWords: round2(avgSentenceWords),
    sentenceLengthStdDev: round2(sentenceLengthStdDev),
    avgParagraphSentences: round2(paragraphCount > 0 ? sentenceCount / paragraphCount : 0),
    longSentenceRatio: round2(longSentences / sentenceCount),
    shortSentenceRatio: round2(shortSentences / sentenceCount),
    questionRatio: round2(questionSentences / sentenceCount),
    exclamationRatio: round2(exclamationSentences / sentenceCount),
    firstPersonRatio: round2(firstPersonSentences / sentenceCount),
    secondPersonRatio: round2(secondPersonSentences / sentenceCount),
    contractionRatio: round2(contractionWords / totalWords),
    avgWordLength: round2(avgWordLength),
    complexWordRatio: round2(complexWordRatio),
    fleschReadingEase: round2(fleschReadingEase),
    readingGradeLevel: round2(readingGradeLevel),
    vocabularyTier: classifyVocabularyTier(readingGradeLevel, complexWordRatio),
    listUsageRatio: round2(totalLines > 0 ? listLines / totalLines : 0),
    headingDensity: round2(totalWords > 0 ? (headingLines / totalWords) * 1000 : 0),
    sampleWordCount: totalWords,
    sampleDocumentCount: usableDocs.length,
    computedAt: new Date().toISOString(),
  };
}

export function isEmptyStyleVector(v: StyleVector): boolean {
  return v.sampleWordCount === 0 || v.sampleDocumentCount === 0;
}

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function frequencyWord(ratio: number): string {
  if (ratio < 0.05) return "rarely";
  if (ratio < 0.2) return "occasionally";
  if (ratio < 0.5) return "often";
  return "usually";
}

/**
 * Turns the measured vector into a handful of prompt-ready lines a writing
 * model can act on directly. Every line is a concrete instruction backed by
 * a number, not a loose adjective.
 */
export function describeStyleVector(v: StyleVector): string {
  if (isEmptyStyleVector(v)) return "";

  const lines: string[] = [];

  const spread = v.avgSentenceWords > 0 ? v.sentenceLengthStdDev / v.avgSentenceWords : 0;
  const lengthShape = spread < 0.3 ? "consistent lengths" : "mixed lengths";
  lines.push(
    `Average sentence: ${v.avgSentenceWords} words (${lengthShape}; ${pct(v.longSentenceRatio)} run long, ${pct(v.shortSentenceRatio)} run short).`,
  );

  lines.push(`Paragraphs run about ${v.avgParagraphSentences} sentences.`);

  lines.push(
    `Reading level: grade ${v.readingGradeLevel} (${v.vocabularyTier} vocabulary, ${pct(v.complexWordRatio)} complex words).`,
  );

  lines.push(
    `${capitalize(frequencyWord(v.questionRatio))} asks questions; ${frequencyWord(v.exclamationRatio)} uses exclamation points.`,
  );

  lines.push(
    `Speaks in first person (I/we) ${frequencyWord(v.firstPersonRatio)}; addresses the reader as "you" ${frequencyWord(v.secondPersonRatio)}.`,
  );

  lines.push(`Contractions ${frequencyWord(v.contractionRatio)} used (don't, we're, it's).`);

  const listNote = v.listUsageRatio >= 0.1 ? "uses lists" : "rarely uses lists";
  const headingNote = v.headingDensity >= 2 ? "breaks sections with headings" : "uses few headings";
  lines.push(`Formatting: ${listNote}; ${headingNote}.`);

  return lines.join("\n");
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
