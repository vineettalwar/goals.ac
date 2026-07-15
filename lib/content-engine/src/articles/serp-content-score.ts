import { scoreArticleQuality, type ArticleQualityResult } from "./article-quality-score";

export type SerpScoreInput = {
  bodyMarkdown: string;
  wordCount?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  targetKeyword?: string | null;
  citations?: { text: string; url: string }[];
  faqSection?: { question: string; answer: string }[];
  jsonLdSchema?: object | null;
  internalLinkSuggestions?: { anchorText: string; suggestedSlug: string }[];
  serpFeatures?: Record<string, unknown> | null;
  competitorTitles?: string[];
  peopleAlsoAsk?: string[];
  /** Optional — passed through to editorial Human voice overlap bonus. */
  writingSample?: string | null;
  brandVoiceExcerpt?: string | null;
};

export type SerpScoreBreakdown = {
  label: string;
  score: number;
  max: number;
  detail: string;
};

export type H2Coverage = {
  covered: number;
  total: number;
  percent: number;
};

export type SerpCoverageResult = {
  total: number;
  breakdown: SerpScoreBreakdown[];
  gaps: string[];
  /** Share of rival SERP topics matched by draft H2s (token-overlap ≥ 0.25). */
  h2Coverage: H2Coverage;
};

export type CompetitorTopicDiff = {
  title: string;
  covered: boolean;
  overlap: number;
};

export type DualContentScore = {
  editorial: ArticleQualityResult;
  serp: SerpCoverageResult;
  combined: number;
  publishReady: boolean;
  competitorDiff: CompetitorTopicDiff[];
};

export function buildCompetitorTopicDiff(input: {
  bodyMarkdown: string;
  competitorTitles?: string[];
  serpFeatures?: Record<string, unknown> | null;
}): CompetitorTopicDiff[] {
  const body = input.bodyMarkdown ?? "";
  const headings = extractHeadings(body);
  const rivals = collectRivalTopics(input.competitorTitles, input.serpFeatures);

  return rivals.map((title) => {
    const overlap = Math.max(
      tokenOverlap(body, title),
      ...headings.map((heading) => tokenOverlap(heading, title)),
    );
    return {
      title,
      covered: overlap >= TOPIC_OVERLAP_THRESHOLD,
      overlap: Math.round(overlap * 100),
    };
  });
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function extractHeadings(body: string): string[] {
  return [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) => match[1]!.trim());
}

/** Draft H2 lines only (`## `), used for rival-topic coverage. */
function extractH2Headings(body: string): string[] {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]!.trim());
}

function collectRivalTopics(
  competitorTitles?: string[],
  serpFeatures?: Record<string, unknown> | null,
): string[] {
  const fromSerp = Array.isArray(serpFeatures?.topResults)
    ? (serpFeatures!.topResults as Array<{ title?: string }>)
        .map((row) => row.title)
        .filter((title): title is string => Boolean(title))
    : [];
  return [...(competitorTitles ?? []), ...fromSerp]
    .filter((title, index, all) => all.indexOf(title) === index)
    .slice(0, 5);
}

const TOPIC_OVERLAP_THRESHOLD = 0.25;

/**
 * Coverage % = covered rival topics / total rivals,
 * where a rival is covered if any draft H2 has token-overlap ≥ 0.25.
 */
export function computeH2Coverage(
  bodyMarkdown: string,
  rivalTopics: string[],
): H2Coverage {
  const total = rivalTopics.length;
  if (total === 0) {
    return { covered: 0, total: 0, percent: 0 };
  }
  const h2s = extractH2Headings(bodyMarkdown);
  const covered =
    h2s.length === 0
      ? 0
      : rivalTopics.filter((title) =>
          h2s.some((heading) => tokenOverlap(heading, title) >= TOPIC_OVERLAP_THRESHOLD),
        ).length;
  return {
    covered,
    total,
    percent: Math.round((covered / total) * 100),
  };
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(normalize(a).split(" ").filter((t) => t.length > 3));
  const bTokens = normalize(b).split(" ").filter((t) => t.length > 3);
  if (aTokens.size === 0 || bTokens.length === 0) return 0;
  let hits = 0;
  for (const token of bTokens) {
    if (aTokens.has(token)) hits += 1;
  }
  return hits / Math.max(bTokens.length, 1);
}

export function scoreSerpCoverage(input: SerpScoreInput): SerpCoverageResult {
  const body = input.bodyMarkdown ?? "";
  const keyword = input.targetKeyword?.trim() ?? "";
  const headings = extractHeadings(body);
  const gaps: string[] = [];
  const breakdown: SerpScoreBreakdown[] = [];

  // Keyword presence in title / H1 / body
  let keywordScore = 0;
  if (keyword) {
    const lower = keyword.toLowerCase();
    const inTitle = (input.metaTitle ?? "").toLowerCase().includes(lower);
    const inH1 = /^#\s+.+/m.test(body) && body.split("\n")[0]?.toLowerCase().includes(lower);
    const inBody = body.toLowerCase().includes(lower);
    keywordScore = (inTitle ? 10 : 0) + (inH1 ? 8 : 0) + (inBody ? 7 : 0);
    if (!inTitle) gaps.push(`Add primary keyword "${keyword}" to the title`);
    if (!inBody) gaps.push(`Mention "${keyword}" naturally in the introduction`);
  } else {
    keywordScore = 12;
    gaps.push("Set a target keyword for SERP coverage scoring");
  }
  breakdown.push({
    label: "Keyword placement",
    score: keywordScore,
    max: 25,
    detail: keyword ? `Target: ${keyword}` : "No target keyword",
  });

  // Competitor heading / topic coverage
  const rivals = collectRivalTopics(input.competitorTitles, input.serpFeatures);
  const h2Coverage = computeH2Coverage(body, rivals);
  let topicScore = 15;
  if (rivals.length > 0) {
    const overlaps = rivals.map((title) =>
      Math.max(tokenOverlap(body, title), ...headings.map((h) => tokenOverlap(h, title))),
    );
    const avg = overlaps.reduce((sum, value) => sum + value, 0) / overlaps.length;
    topicScore = Math.round(avg * 25);
    for (let i = 0; i < rivals.length; i++) {
      if ((overlaps[i] ?? 0) < TOPIC_OVERLAP_THRESHOLD) {
        gaps.push(`Cover competitor angle: ${rivals[i]}`);
      }
    }
  } else {
    gaps.push("Connect rank tracking or Semrush to load competitor SERP titles");
  }
  breakdown.push({
    label: "Topic coverage vs SERP",
    score: topicScore,
    max: 25,
    detail: rivals.length > 0 ? `${rivals.length} competitor titles compared` : "No SERP titles yet",
  });

  // People Also Ask / FAQ coverage
  const paa = input.peopleAlsoAsk?.length
    ? input.peopleAlsoAsk
    : Array.isArray(input.serpFeatures?.peopleAlsoAsk)
      ? (input.serpFeatures!.peopleAlsoAsk as string[]).filter((q) => typeof q === "string")
      : [];
  const faqCount =
    input.faqSection?.length ?? countMatches(body, /^###\s+.+\?/gm);
  let paaScore = 10;
  if (paa.length > 0) {
    const covered = paa.filter((question) => {
      const q = normalize(question);
      return normalize(body).includes(q.slice(0, 40)) || headings.some((h) => tokenOverlap(h, question) > 0.4);
    }).length;
    paaScore = Math.round((covered / paa.length) * 25);
    for (const question of paa) {
      if (!covered || !normalize(body).includes(normalize(question).slice(0, 40))) {
        if (paaScore < 20) gaps.push(`Answer PAA: ${question}`);
      }
    }
  } else if (faqCount >= 3) {
    paaScore = 18;
  } else {
    gaps.push("Add 3+ FAQ answers for People Also Ask coverage");
  }
  breakdown.push({
    label: "PAA / FAQ coverage",
    score: paaScore,
    max: 25,
    detail: paa.length > 0 ? `${paa.length} PAA questions` : `${faqCount} FAQ-style headings`,
  });

  // Featured snippet / structure signals
  const hasLists = /^[-*]\s+/m.test(body) || /^\d+\.\s+/m.test(body);
  const hasTables = /\|.+\|/.test(body);
  const featuredPresent = Boolean(input.serpFeatures?.featuredSnippet);
  let snippetScore = (hasLists ? 8 : 0) + (hasTables ? 5 : 0) + (faqCount >= 2 ? 7 : 0);
  if (featuredPresent && snippetScore < 15) {
    gaps.push("SERP has a featured snippet — add a concise definition list or table");
  }
  snippetScore = Math.min(25, snippetScore);
  breakdown.push({
    label: "Snippet-ready structure",
    score: snippetScore,
    max: 25,
    detail: featuredPresent ? "Featured snippet active on SERP" : "Lists / tables / FAQ depth",
  });

  const total = Math.min(
    100,
    breakdown.reduce((sum, row) => sum + row.score, 0),
  );

  return {
    total,
    breakdown,
    gaps: [...new Set(gaps)].slice(0, 8),
    h2Coverage,
  };
}

export function scoreDualContentQuality(input: SerpScoreInput): DualContentScore {
  const editorial = scoreArticleQuality({
    bodyMarkdown: input.bodyMarkdown,
    wordCount: input.wordCount,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    citations: input.citations,
    faqSection: input.faqSection,
    jsonLdSchema: input.jsonLdSchema,
    internalLinkSuggestions: input.internalLinkSuggestions,
    writingSample: input.writingSample,
    brandVoiceExcerpt: input.brandVoiceExcerpt,
  });
  const serp = scoreSerpCoverage(input);
  const combined = Math.round(editorial.total * 0.55 + serp.total * 0.45);
  return {
    editorial,
    serp,
    combined,
    publishReady: editorial.total >= 70 && serp.total >= 65,
    competitorDiff: buildCompetitorTopicDiff(input),
  };
}
