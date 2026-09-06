import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
} from "@workspace/content-engine/support/competitor/competitor-url";
import type { ContentFormatType, PublishDestinationId } from "../content-piece/publish-destinations";
import { STUDIO_FORMAT_OPTIONS } from "./types";

export type CreateContentDraftInput = {
  title: string;
  targetKeyword: string;
  formatType: string;
  angleHint?: string;
  plannedDate?: string | null;
  /** Optional pre-selected publish destination (shapes generation when supported). */
  intendedPublishPlatform?: string;
  /** Primary competitor URL sent to generate as competitorFocusUrl. */
  competitorFocusUrl?: string;
  /** All selected competitor URLs (max 5; focus first when set). Sent as competitorUrls. */
  competitorUrls?: string[];
  /** Source brief this piece was created from (deep-linked via ?briefId=). */
  briefId?: number;
};

export type CreateContentInitialValues = Partial<CreateContentDraftInput>;

/** Minimal brief shape needed to seed the create dialog — matches the briefs API row. */
export type BriefDraftSource = {
  id: number;
  workingTitle: string;
  targetKeywordCluster?: string | null;
  angle?: string | null;
  format?: string | null;
};

/** Mirrors Next `briefToDraft` (content-studio-utils.ts) for the shell create dialog. */
export function briefToCreateContentInitialValues(
  brief: BriefDraftSource,
): CreateContentInitialValues {
  const parts = [`Title: ${brief.workingTitle}`];
  if (brief.targetKeywordCluster) parts.push(`Keywords: ${brief.targetKeywordCluster}`);
  if (brief.angle) parts.push(brief.angle);

  return {
    briefId: brief.id,
    title: brief.workingTitle,
    targetKeyword: brief.targetKeywordCluster?.trim() || brief.workingTitle,
    formatType:
      brief.format && VALID_FORMATS.has(brief.format as never) ? brief.format : "blog_post",
    angleHint: parts.join("\n"),
  };
}

/** Project-level competitor row for the create-wizard picker. */
export type CreateCompetitorOption = {
  url: string;
  name?: string;
  summary?: string;
  threatLevel?: "low" | "medium" | "high";
  contentGaps?: string[];
};

export type RepurposeContentInput = {
  targetFormat: string;
  targetKeyword: string;
  existingContent: string;
};

export type CreateSourcePieceOption = {
  id: number;
  title: string;
  targetKeyword?: string | null;
  formatType?: string;
};

/** Compact create flow: [path?] → format → keyword → … → review. */
export type CreateFlow = "create" | "repurpose";
export type CreateStepId =
  | "path"
  | "format"
  | "keyword"
  | "competitors"
  | "destination"
  | "source"
  | "review";

export const VALID_FORMATS = new Set(STUDIO_FORMAT_OPTIONS.map((option) => option.value));
export const MAX_COMPETITOR_URLS = 5;
export const MIN_REPURPOSE_CHARS = 50;

/** Mirrors `SEO_LONGFORM_FORMATS` in content-engine — no db type dependency here. */
const SEO_LONGFORM_FORMATS = new Set([
  "blog_post",
  "guide",
  "tutorial",
  "pillar_page",
  "whitepaper",
  "faq_article",
  "news_article",
  "location_page",
]);

/** Progress labels — index driven by SSE stream phase when the host feeds generatingPhase. */
export const GENERATING_LABELS = ["Analyzing", "Drafting", "Finishing"] as const;

export type CreateGeneratingPhase = "analyzing" | "drafting" | "finishing";

export function phaseToLabelIndex(phase: CreateGeneratingPhase | null | undefined): number {
  if (phase === "finishing") return 2;
  if (phase === "drafting") return 1;
  return 0;
}

export function isSeoLongform(formatType: string): boolean {
  return SEO_LONGFORM_FORMATS.has(formatType);
}

export function asContentFormat(formatType: string): ContentFormatType | null {
  return VALID_FORMATS.has(formatType as never) ? (formatType as ContentFormatType) : null;
}

export function competitorUrlsFromInitial(
  initial: CreateContentInitialValues | null | undefined,
): string[] {
  const fromList = initial?.competitorUrls?.filter((u) => u.trim()) ?? [];
  if (fromList.length > 0) return normalizeCompetitorUrlList(fromList);
  const focus = initial?.competitorFocusUrl?.trim();
  return focus ? normalizeCompetitorUrlList([focus]) : [];
}

export function optionByHost(options: CreateCompetitorOption[]): Map<string, CreateCompetitorOption> {
  const map = new Map<string, CreateCompetitorOption>();
  for (const option of options) {
    const url = normalizeCompetitorUrl(option.url);
    if (!url) continue;
    map.set(hostFromUrl(url), { ...option, url });
  }
  return map;
}

export function buildSteps(
  flow: CreateFlow,
  formatType: string,
  destinations: { id: PublishDestinationId }[],
  enableRepurpose: boolean,
): CreateStepId[] {
  if (flow === "repurpose") {
    const steps: CreateStepId[] = enableRepurpose ? ["path"] : [];
    steps.push("format", "keyword", "source", "review");
    return steps;
  }
  const steps: CreateStepId[] = enableRepurpose ? ["path", "format", "keyword"] : ["format", "keyword"];
  if (isSeoLongform(formatType)) steps.push("competitors");
  if (destinations.length > 0) steps.push("destination");
  steps.push("review");
  return steps;
}
