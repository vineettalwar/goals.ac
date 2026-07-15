import { countAiSlopSignals } from "../content/ai-writing-rules";

export type ArticleQualityInput = {
  bodyMarkdown: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  citations?: { text: string; url: string }[];
  faqSection?: { question: string; answer: string }[];
  jsonLdSchema?: object | null;
  internalLinkSuggestions?: { anchorText: string; suggestedSlug: string }[];
  wordCount?: number;
  /** Optional writing sample for token-overlap bonus (no penalty if omitted). */
  writingSample?: string | null;
  /** Optional brand-voice excerpt; used when writingSample is absent. */
  brandVoiceExcerpt?: string | null;
  /** Optional brand glossary terms — presence boost when a sample/passage is also present. */
  brandGlossary?: string[];
  /** Optional brand-voice passages; Jaccard vs concat, max'd with writingSample. */
  brandVoicePassages?: string[];
};

export type ArticleQualityBreakdown = {
  label: string;
  score: number;
  max: number;
  detail: string;
};

export type ArticleQualityResult = {
  total: number;
  breakdown: ArticleQualityBreakdown[];
};

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function countExternalLinks(body: string): number {
  return countMatches(body, /\[.+?\]\(https?:\/\/[^)]+\)/g);
}

function countInternalLinks(body: string): number {
  return countMatches(body, /\[.+?\]\(\/[^)]+\)/g);
}

function inferFaqCount(body: string): number {
  const faqSection = body.match(/##\s*(?:FAQ|Frequently Asked Questions)[\s\S]*/i)?.[0] ?? "";
  const target = faqSection || body;
  const h3Questions = countMatches(target, /^###\s+.+\?/gm);
  const boldQuestions = countMatches(target, /^\*\*.+\?\*\*/gm);
  return Math.max(h3Questions, boldQuestions);
}

function inferMetaDescription(body: string): string | null {
  const withoutTitle = body.replace(/^#\s+.+\n?/m, "").trim();
  const firstParagraph = withoutTitle
    .split(/\n\s*\n/)
    .map((block) => block.replace(/^#+\s+/gm, "").replace(/\*\*/g, "").trim())
    .find((block) => block.length > 40 && !block.startsWith("-"));
  return firstParagraph ?? null;
}

function stripMarkdownForProse(body: string): string {
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

function wordTokens(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function tokenizeForOverlap(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of Array.from(a)) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function distinctiveTokens(tokens: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const t of Array.from(tokens)) {
    if (t.length >= 5) out.add(t);
  }
  return out;
}

/**
 * Anti-slop half (~0–8): inverse of AI-tell count from countAiSlopSignals.
 */
function scoreAntiSlop(slop: number): number {
  if (slop === 0) return 8;
  if (slop <= 2) return 7;
  if (slop <= 4) return 5;
  if (slop <= 8) return 3;
  if (slop <= 15) return 1;
  return 0;
}

/**
 * Rhythm / specificity half (~0–7), cheap heuristics — no ML/deps:
 * - sentence-length variance (short+long mix) → 0–2
 * - contraction usage → 0–2
 * - concrete number + mid-sentence Capital density → 0–2
 * - low bullet density (avoid “bullet essay”) → 0–1
 */
function scoreRhythmSpecificity(body: string): number {
  const prose = stripMarkdownForProse(body);
  const words = wordTokens(prose);
  const wordCount = words.length;
  if (wordCount < 40) return 1;

  let pts = 0;

  const sentences = prose
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => wordTokens(s).length >= 3);
  const lengths = sentences.map((s) => wordTokens(s).length);
  if (lengths.length >= 3) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / lengths.length;
    const stddev = Math.sqrt(variance);
    const hasShort = lengths.some((n) => n <= 8);
    const hasLong = lengths.some((n) => n >= 18);
    if (hasShort && hasLong && stddev >= 5) pts += 2;
    else if ((hasShort && hasLong) || stddev >= 4) pts += 1;
  }

  const contractions = countMatches(
    prose,
    /\b(?:[A-Za-z]+n't|[A-Za-z]+'(?:ll|re|ve|d|m))\b/g,
  );
  const contractionPer100 = (contractions / wordCount) * 100;
  if (contractionPer100 >= 1.5) pts += 2;
  else if (contractionPer100 >= 0.5) pts += 1;

  const numbers = countMatches(prose, /\b\d[\d,]*(?:\.\d+)?%?\b/g);
  const midCapitals = countMatches(prose, /(?<=\s)[A-Z][a-z]{2,}\b/g);
  const concretePer100 = ((numbers + midCapitals) / wordCount) * 100;
  if (concretePer100 >= 2) pts += 2;
  else if (concretePer100 >= 0.8) pts += 1;

  const nonEmptyLines = body.split("\n").filter((line) => line.trim().length > 0);
  const bulletLines = nonEmptyLines.filter((line) =>
    /^\s*(?:[-*+]|\d+\.)\s+/.test(line),
  ).length;
  const bulletRatio =
    nonEmptyLines.length === 0 ? 0 : bulletLines / nonEmptyLines.length;
  if (bulletRatio <= 0.25) pts += 1;

  return Math.min(7, pts);
}

/** Map raw Jaccard similarity to 0–3 points. */
function jaccardToPoints(j: number): number {
  if (j >= 0.12) return 3;
  if (j >= 0.07) return 2;
  if (j >= 0.03) return 1;
  return 0;
}

/**
 * Jaccard overlap points (0–3) for one sample string. Short/empty sample → 0.
 */
function scoreJaccardOverlap(body: string, sample: string | null | undefined): number {
  const trimmed = sample?.trim();
  if (!trimmed || trimmed.length < 40) return 0;

  const bodyTokens = tokenizeForOverlap(stripMarkdownForProse(body));
  const sampleTokens = tokenizeForOverlap(trimmed);
  if (sampleTokens.size < 8 || bodyTokens.size < 8) return 0;

  return jaccardToPoints(jaccardSimilarity(bodyTokens, sampleTokens));
}

/**
 * Shared distinctive tokens (len ≥ 5) between body and sample → 0–2.
 * Omitted/short sample → 0.
 */
function scoreDistinctiveTokenBoost(
  body: string,
  sample: string | null | undefined,
): number {
  const trimmed = sample?.trim();
  if (!trimmed || trimmed.length < 40) return 0;

  const bodyDist = distinctiveTokens(tokenizeForOverlap(stripMarkdownForProse(body)));
  const sampleDist = distinctiveTokens(tokenizeForOverlap(trimmed));
  if (sampleDist.size < 4 || bodyDist.size < 4) return 0;

  let hit = 0;
  for (const t of Array.from(sampleDist)) {
    if (bodyDist.has(t)) hit += 1;
  }
  const share = hit / sampleDist.size;
  if (share >= 0.15) return 2;
  if (share >= 0.08) return 1;
  return 0;
}

/**
 * Brand glossary term presence in body → 0–2. Only meaningful when a sample is present.
 */
function scoreGlossaryPresence(body: string, glossary?: string[]): number {
  if (!glossary?.length) return 0;
  const prose = stripMarkdownForProse(body).toLowerCase();
  if (prose.length < 40) return 0;

  let hits = 0;
  for (const raw of glossary) {
    const term = raw?.trim().toLowerCase();
    if (!term || term.length < 2) continue;
    if (prose.includes(term)) hits += 1;
  }
  if (hits >= 2) return 2;
  if (hits === 1) return 1;
  return 0;
}

function concatPassages(passages?: string[]): string | null {
  if (!passages?.length) return null;
  const joined = passages
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p && p.length > 0))
    .join("\n\n")
    .trim();
  return joined.length >= 40 ? joined : null;
}

type BrandVoiceScoreInput = {
  writingSample?: string | null;
  brandVoiceExcerpt?: string | null;
  brandGlossary?: string[];
  brandVoicePassages?: string[];
};

/**
 * Brand / sample signals (0–5), never a penalty when omitted:
 * - Jaccard vs writingSample/excerpt and vs concatenated passages (max)
 * - distinctive-token share boost when a sample exists
 * - glossary presence boost when a sample exists and glossary is passed
 */
function scoreBrandVoiceSignals(
  body: string,
  input: BrandVoiceScoreInput,
): { bonus: number; hasSample: boolean } {
  const primary = (input.writingSample ?? input.brandVoiceExcerpt)?.trim() || null;
  const passages = concatPassages(input.brandVoicePassages);
  const hasSample = Boolean(
    (primary && primary.length >= 40) || passages,
  );

  if (!hasSample) {
    return { bonus: 0, hasSample: false };
  }

  const jaccardPts = Math.max(
    scoreJaccardOverlap(body, primary),
    scoreJaccardOverlap(body, passages),
  );

  // Distinctive boost against the richest available brand text.
  const distinctiveSource =
    [primary, passages]
      .filter((s): s is string => Boolean(s))
      .sort((a, b) => b.length - a.length)[0] ?? primary;
  const distinctivePts = scoreDistinctiveTokenBoost(body, distinctiveSource);
  const glossaryPts = scoreGlossaryPresence(body, input.brandGlossary);

  const bonus = Math.min(5, jaccardPts + distinctivePts + glossaryPts);
  return { bonus, hasSample: true };
}

/**
 * Human voice (max 15) = anti-slop (~0–8) + rhythm/specificity (~0–7)
 * + optional brand signals (Jaccard + distinctive tokens + glossary, 0–5), capped at 15.
 * Detail strings report AI tells + rhythm — not detector/"undetectable" claims.
 */
function scoreHumanVoice(
  body: string,
  brand: BrandVoiceScoreInput,
): { score: number; detail: string } {
  const slop = countAiSlopSignals(body);
  const antiSlop = scoreAntiSlop(slop);
  const rhythm = scoreRhythmSpecificity(body);
  const { bonus: brandBonus, hasSample } = scoreBrandVoiceSignals(body, brand);
  const score = Math.min(15, antiSlop + rhythm + brandBonus);

  const tellPart =
    slop === 0
      ? "no AI tells"
      : `${slop} AI tell${slop === 1 ? "" : "s"}`;

  if (hasSample) {
    const brandPart = brandBonus > 0 ? `, +${brandBonus} brand match` : "";
    const detail = `AI tells + rhythm + brand sample: ${tellPart}, rhythm ${rhythm}/7${brandPart}`;
    return { score, detail };
  }

  const detail = `AI tells + rhythm (add writing sample for brand match): ${tellPart}, rhythm ${rhythm}/7`;
  return { score, detail };
}

export function scoreArticleQuality(input: ArticleQualityInput): ArticleQualityResult {
  const body = input.bodyMarkdown ?? "";
  const wordCount = input.wordCount ?? body.split(/\s+/).filter(Boolean).length;
  const h2Count = countMatches(body, /^## /gm);
  const faqCount = input.faqSection?.length ?? inferFaqCount(body);
  const hasFaq = faqCount >= 3;
  const citationCount = input.citations?.length ?? countExternalLinks(body);
  const internalLinks =
    input.internalLinkSuggestions?.length ?? countInternalLinks(body);
  const hasSchema = Boolean(input.jsonLdSchema && Object.keys(input.jsonLdSchema).length > 0);
  const titleLen = input.metaTitle?.length ?? 0;
  const inferredMeta = inferMetaDescription(body);
  const metaLen = input.metaDescription?.length ?? inferredMeta?.length ?? 0;
  const humanVoice = scoreHumanVoice(body, {
    writingSample: input.writingSample,
    brandVoiceExcerpt: input.brandVoiceExcerpt,
    brandGlossary: input.brandGlossary,
    brandVoicePassages: input.brandVoicePassages,
  });

  const breakdown: ArticleQualityBreakdown[] = [
    {
      label: "Human voice",
      score: humanVoice.score,
      max: 15,
      detail: humanVoice.detail,
    },
    {
      label: "Structure",
      score: Math.min(15, h2Count >= 4 ? 15 : h2Count >= 2 ? 10 : h2Count >= 1 ? 5 : 0),
      max: 15,
      detail: `${h2Count} H2 sections`,
    },
    {
      label: "FAQ",
      score: hasFaq ? 15 : faqCount > 0 ? 8 : 0,
      max: 15,
      detail: hasFaq ? "FAQ section present" : faqCount > 0 ? `${faqCount} FAQ items` : "Add 3+ FAQ items",
    },
    {
      label: "Citations",
      score: Math.min(15, citationCount >= 3 ? 15 : citationCount >= 1 ? 8 : 0),
      max: 15,
      detail: `${citationCount} external citations`,
    },
    {
      label: "Internal links",
      score: Math.min(15, internalLinks >= 3 ? 15 : internalLinks >= 1 ? 8 : 0),
      max: 15,
      detail: `${internalLinks} internal link opportunities`,
    },
    {
      label: "Schema",
      score: hasSchema ? 5 : 0,
      max: 5,
      detail: hasSchema ? "JSON-LD present" : "Missing structured data",
    },
    {
      label: "Meta title",
      score: titleLen >= 30 && titleLen <= 60 ? 5 : titleLen > 0 ? 3 : 0,
      max: 5,
      detail: titleLen ? `${titleLen} characters` : "Missing meta title",
    },
    {
      label: "Meta description",
      score: metaLen >= 50 && metaLen <= 160 ? 5 : metaLen > 0 ? 3 : 0,
      max: 5,
      detail: metaLen ? `${metaLen} characters` : "Missing meta description",
    },
    {
      label: "Word count",
      score: wordCount >= 1200 && wordCount <= 2500 ? 5 : wordCount >= 800 ? 3 : wordCount >= 400 ? 1 : 0,
      max: 5,
      detail: `${wordCount.toLocaleString()} words`,
    },
  ];

  const total = breakdown.reduce((sum, item) => sum + item.score, 0);
  return { total, breakdown };
}
