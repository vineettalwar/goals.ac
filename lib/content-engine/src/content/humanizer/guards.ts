import { scoreArticleQuality } from "../../articles/article-quality-score";
import type { HumanizationLevel } from "../../brand/brand-voice";
import type { HumanizationAudit } from "../content-piece-seo";
import { extractHeadings, extractLinkUrls } from "./text-utils";

/** Minimum human-voice score (0–15 scale) after a successful rewrite. */
export const HUMANIZE_HUMAN_VOICE_FLOOR = 4;

export function buildAudit(
  level: HumanizationLevel,
  slopScoreBefore: number,
  slopScoreAfter: number,
  rejected = false,
  reason?: string,
): HumanizationAudit {
  return {
    slopScoreBefore,
    slopScoreAfter,
    humanizationLevel: level,
    rejected,
    ...(reason ? { reason } : {}),
    tellsFixed: Math.max(0, slopScoreBefore - slopScoreAfter),
  };
}

function countFaqItemsInBody(markdown: string): number {
  const faqSection = markdown.match(/##\s*(?:FAQ|Frequently Asked Questions)[\s\S]*/i)?.[0] ?? "";
  const target = faqSection || markdown;
  const h3 = (target.match(/^###\s+.+\?/gm) ?? []).length;
  const bold = (target.match(/^\*\*.+\?\*\*/gm) ?? []).length;
  return Math.max(h3, bold);
}

function hasFaqHeading(markdown: string): boolean {
  return /^##\s*(?:FAQ|Frequently Asked Questions)\b/im.test(markdown);
}

function countH2(markdown: string): number {
  return (markdown.match(/^##\s+/gm) ?? []).length;
}

/**
 * Structure guards: headings, body links, FAQ block, citation URLs, H2 floor.
 * Pure — unit-tested without calling the model.
 */
export function passesHumanizeStructureGuards(
  original: string,
  rewritten: string,
  citationUrls: string[] = [],
): { ok: true } | { ok: false; reason: string } {
  if (hasFaqHeading(original)) {
    if (!hasFaqHeading(rewritten)) {
      return { ok: false, reason: "FAQ guard" };
    }
    const beforeFaq = countFaqItemsInBody(original);
    if (beforeFaq > 0 && countFaqItemsInBody(rewritten) < beforeFaq) {
      return { ok: false, reason: "FAQ guard" };
    }
  }

  const originalHeadings = extractHeadings(original);
  const rewrittenHeadings = extractHeadings(rewritten);
  if (rewrittenHeadings.length < originalHeadings.length) {
    return { ok: false, reason: "heading guard" };
  }

  const originalH2 = countH2(original);
  if (originalH2 > 0 && countH2(rewritten) < originalH2) {
    return { ok: false, reason: "H2 floor" };
  }

  const originalUrls = extractLinkUrls(original);
  const rewrittenUrls = new Set(extractLinkUrls(rewritten));
  if (!originalUrls.every((url) => rewrittenUrls.has(url))) {
    return { ok: false, reason: "link guard" };
  }

  for (const url of citationUrls) {
    const trimmed = url?.trim();
    if (!trimmed) continue;
    if (!rewrittenUrls.has(trimmed) && !rewritten.includes(trimmed)) {
      return { ok: false, reason: "citation guard" };
    }
  }

  return { ok: true };
}

/**
 * Quality gate: slop must improve when tells existed; human-voice must clear floor.
 * Pure — unit-tested without calling the model.
 */
export function passesHumanizeQualityGate(
  bodyBefore: string,
  bodyAfter: string,
  slopBefore: number,
  slopAfter: number,
  opts: { skipHumanVoiceFloor?: boolean } = {},
): { ok: true } | { ok: false; reason: string } {
  if (slopBefore > 0 && slopAfter >= slopBefore) {
    return { ok: false, reason: "no slop improvement" };
  }

  if (opts.skipHumanVoiceFloor) {
    return { ok: true };
  }

  const voiceAfter =
    scoreArticleQuality({ bodyMarkdown: bodyAfter }).breakdown.find(
      (row) => row.label === "Human voice",
    )?.score ?? 0;

  if (voiceAfter < HUMANIZE_HUMAN_VOICE_FLOOR) {
    const voiceBefore =
      scoreArticleQuality({ bodyMarkdown: bodyBefore }).breakdown.find(
        (row) => row.label === "Human voice",
      )?.score ?? 0;
    // Reject when we fall under the floor from above, or when voice got worse while under it.
    if (voiceBefore >= HUMANIZE_HUMAN_VOICE_FLOOR || voiceAfter < voiceBefore) {
      return { ok: false, reason: "human-voice floor" };
    }
  }

  return { ok: true };
}
