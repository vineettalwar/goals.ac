/**
 * Light term coverage checklist — secondary keywords + PAA/H2-ish topics vs draft body.
 *
 * Deliberately not Surfer-style NLP: no term frequency targets, no density scoring,
 * just a plain "does this phrase show up" check. Label it honestly in the UI.
 */

export type CoverageTermType = "secondary" | "paa" | "h2";

export type CoverageChecklistItem = {
  term: string;
  type: CoverageTermType;
  covered: boolean;
};

export type CoverageChecklistInput = {
  bodyMarkdown: string;
  /** Secondary keywords from brief/piece metadata. */
  secondaryKeywords?: string[] | null;
  /** People Also Ask questions from the SERP score payload. */
  peopleAlsoAsk?: string[] | null;
  /** Rival H2-ish topic titles (competitor headings / top results). */
  h2Topics?: string[] | null;
};

export type CoverageChecklistResult = {
  items: CoverageChecklistItem[];
  coveredCount: number;
  totalCount: number;
  percent: number;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole-phrase match, falling back to significant-word overlap for longer phrases (e.g. PAA questions). */
function isPhraseCovered(normalizedBody: string, phrase: string): boolean {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return false;
  if (normalizedBody.includes(normalizedPhrase)) return true;

  const words = normalizedPhrase.split(" ").filter((word) => word.length > 3);
  if (words.length === 0) return false;
  const hits = words.filter((word) => normalizedBody.includes(word)).length;
  return hits / words.length >= 0.7;
}

function dedupeTerms(terms?: string[] | null): string[] {
  if (!terms?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const term of terms) {
    const trimmed = term?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/** Pure scorer — secondary keywords + PAA/H2-ish tokens covered vs missing in the draft body. */
export function scoreCoverageChecklist(input: CoverageChecklistInput): CoverageChecklistResult {
  const normalizedBody = normalize(input.bodyMarkdown ?? "");

  const buckets: Array<{ terms: string[]; type: CoverageTermType }> = [
    { terms: dedupeTerms(input.secondaryKeywords), type: "secondary" },
    { terms: dedupeTerms(input.peopleAlsoAsk), type: "paa" },
    { terms: dedupeTerms(input.h2Topics), type: "h2" },
  ];

  const items: CoverageChecklistItem[] = buckets.flatMap(({ terms, type }) =>
    terms.map((term) => ({
      term,
      type,
      covered: isPhraseCovered(normalizedBody, term),
    })),
  );

  const coveredCount = items.filter((item) => item.covered).length;
  const totalCount = items.length;

  return {
    items,
    coveredCount,
    totalCount,
    percent: totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0,
  };
}
