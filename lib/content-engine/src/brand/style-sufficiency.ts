/**
 * Scores whether a scanned corpus carries enough real writing for a
 * measured style vector to be trustworthy. Pure and deterministic: no AI,
 * no network. When the score comes back insufficient, onboarding falls
 * back to a short style questionnaire instead of trusting a thin scrape.
 */

export const STYLE_SUFFICIENCY_MIN_WORDS = 1200;
export const STYLE_SUFFICIENCY_MIN_PAGES = 3;

const USABLE_PAGE_MIN_WORDS = 120;
const SUFFICIENCY_SCORE_THRESHOLD = 75;

export type StyleSufficiency = {
  sufficient: boolean;
  score: number;
  totalWords: number;
  usablePages: number;
  reasons: string[];
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function evaluateStyleSufficiency(input: {
  pageDocuments: { text: string }[];
  voiceToneConfidence?: "high" | "medium" | "low";
}): StyleSufficiency {
  const wordCounts = input.pageDocuments.map((doc) => countWords(doc.text ?? ""));
  const usablePages = wordCounts.filter((count) => count >= USABLE_PAGE_MIN_WORDS).length;
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);

  const pageRatio = usablePages / STYLE_SUFFICIENCY_MIN_PAGES;
  const wordRatio = totalWords / STYLE_SUFFICIENCY_MIN_WORDS;

  // Base score gives partial credit for exceeding the minimums (capped at
  // 1.3x) before the confidence penalty is applied below, so a comfortably
  // large corpus survives a low-confidence extraction while a corpus that
  // only just clears the minimums does not.
  let score = 100 * Math.min(1.3, (pageRatio + wordRatio) / 2);

  if (input.voiceToneConfidence === "low") {
    score -= 30;
  } else if (input.voiceToneConfidence === "medium") {
    score -= 10;
  }
  score = Math.round(Math.max(0, Math.min(100, score)));

  const meetsRawMinimums =
    usablePages >= STYLE_SUFFICIENCY_MIN_PAGES && totalWords >= STYLE_SUFFICIENCY_MIN_WORDS;

  const reasons: string[] = [];
  if (usablePages < STYLE_SUFFICIENCY_MIN_PAGES) {
    reasons.push(
      `Only ${usablePages} page${usablePages === 1 ? "" : "s"} had enough text to read your style (need ${STYLE_SUFFICIENCY_MIN_PAGES}).`,
    );
  }
  if (totalWords < STYLE_SUFFICIENCY_MIN_WORDS) {
    reasons.push(
      `Only ${totalWords} words of usable text were found (need ${STYLE_SUFFICIENCY_MIN_WORDS}).`,
    );
  }
  if (input.voiceToneConfidence === "low" && meetsRawMinimums && score < SUFFICIENCY_SCORE_THRESHOLD) {
    reasons.push("The tone we read from your site was low confidence, so we want to double check.");
  }

  const sufficient = meetsRawMinimums && score >= SUFFICIENCY_SCORE_THRESHOLD;

  return { sufficient, score, totalWords, usablePages, reasons };
}
