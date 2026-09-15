import type { ContentPieceMetadata } from "../types";

export type DualContentScore = {
  editorial: { total: number; breakdown: Array<{ label: string; score: number; max: number }> };
  serp: {
    total: number;
    breakdown: Array<{ label: string; score: number; max: number; detail: string }>;
    gaps: string[];
    h2Coverage?: { covered: number; total: number; percent: number };
  };
  combined: number;
  publishReady: boolean;
  competitorDiff?: Array<{ title: string; covered: boolean; overlap: number }>;
  /** Raw SERP snapshot — PAA questions live at `serpFeatures.peopleAlsoAsk`. */
  serpFeatures?: Record<string, unknown> | null;
  scoredAt?: string;
  /** Brand voice context from project — used for local Human voice scoring when props omit them. */
  writingSample?: string | null;
  brandGlossary?: string[] | null;
  brandVoicePassages?: string[] | null;
};

export type ArticleQualityPanelProps = {
  bodyMarkdown: string;
  wordCount?: number;
  metadata?: ContentPieceMetadata | null;
  /** Secondary keywords for the coverage checklist (brief/piece meta). */
  secondaryKeywords?: string[] | null;
  contentPieceId?: number | null;
  /** When set, social formats use thread/post scoring instead of article SEO. */
  formatType?: string | null;
  /** Host fetches `/api/content-pieces/:id/serp-score` (JWT or cookie). */
  fetchDualScore?: (contentPieceId: number) => Promise<DualContentScore | null>;
  /** When parent already loaded dual score (e.g. brief panel), skip internal fetch. */
  dualScore?: DualContentScore | null;
  /** Optional brand voice signals for Human voice editorial score. */
  writingSample?: string | null;
  brandVoiceExcerpt?: string | null;
  brandGlossary?: string[];
  brandVoicePassages?: string[];
  /** Last saved body — used to compute baseline for delta when `baselineScore` is omitted. */
  savedBodyMarkdown?: string | null;
  /** Precomputed score for the last saved body (editorial or combined). Wins over scoring `savedBodyMarkdown`. */
  baselineScore?: number | null;
  /** When true (edit mode), show "+N vs saved" if live score differs from baseline. */
  showScoreDelta?: boolean;
  /** When true, clicking a missing coverage chip inserts a stub into the draft instead of copying. */
  editing?: boolean;
  /** Host appends the stub markdown/sentence to the draft body. Only used while `editing`. */
  onInsertMissingTerm?: (snippet: string) => void;
  /** Host replaces the full draft body (internal-link apply). */
  onReplaceBody?: (markdown: string) => void;
  /** Skip linking to the current page's slug when known. */
  excludeInternalSlug?: string | null;
  /** Called with the current coverage checklist's missing terms (secondary keywords / PAA / rival topics), if any. */
  onEnhance?: (missingTerms?: string[]) => void;
  enhancing?: boolean;
  canEnhance?: boolean;
};
