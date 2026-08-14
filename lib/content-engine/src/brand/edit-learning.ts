/**
 * Learning brand voice from the edits a founder makes to generated drafts.
 *
 * Every edit is a correction: the founder is showing, concretely, how they want
 * to sound. That signal was being thrown away — drafts started from the same
 * place every time no matter how much the last ten were rewritten.
 *
 * The edited text becomes a voice source, because the finished version is the
 * ground truth. The words consistently deleted are captured separately, since
 * those are the makings of an anti-pattern list.
 *
 * The comparison and threshold logic is pure and unit-tested;
 * `learnFromPieceEdit` is the only function here that touches the database.
 */

import {
  enqueueBrandVoiceIndex,
  ingestBrandVoiceDocuments,
  type BrandVoiceIngestDocument,
} from "./brand-voice-indexer";
import { logger } from "../core/logger";

export type EditSummary = {
  /**
   * How much of the draft changed, 0–1. A Dice distance over word multisets:
   * 0 means identical, 1 means nothing in common.
   */
  changedRatio: number;
  /** Words the founder introduced, most frequent first. */
  addedWords: string[];
  /** Words the founder removed — candidate anti-patterns. */
  removedWords: string[];
};

/**
 * Below this, the edit is a typo fix or a punctuation tweak. Re-indexing a
 * whole article for that would dilute the voice profile with near-duplicates.
 */
const MIN_CHANGED_RATIO = 0.05;

/** Too short to carry a voice signal worth storing. */
const MIN_EDITED_CHARS = 200;

/** Cap on reported word lists, so metadata stays readable. */
const MAX_WORD_SAMPLES = 25;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function counts(items: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}

/** Words present more often in `from` than in `to`, most frequent first. */
function surplus(from: Map<string, number>, to: Map<string, number>): string[] {
  const diffs: Array<[string, number]> = [];
  for (const [word, count] of from) {
    const delta = count - (to.get(word) ?? 0);
    if (delta > 0) diffs.push([word, delta]);
  }
  // Frequency first, then alphabetical, so the same edit always reports the
  // same list.
  diffs.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return diffs.slice(0, MAX_WORD_SAMPLES).map(([word]) => word);
}

/** Compare a generated draft against what the founder actually published. */
export function summarizeEdit(original: string, edited: string): EditSummary {
  const originalWords = words(original);
  const editedWords = words(edited);
  const originalCounts = counts(originalWords);
  const editedCounts = counts(editedWords);

  let shared = 0;
  for (const [word, count] of originalCounts) {
    shared += Math.min(count, editedCounts.get(word) ?? 0);
  }

  const total = originalWords.length + editedWords.length;
  const changedRatio = total === 0 ? 0 : 1 - (2 * shared) / total;

  return {
    changedRatio,
    addedWords: surplus(editedCounts, originalCounts),
    removedWords: surplus(originalCounts, editedCounts),
  };
}

/**
 * Whether an edit carries enough signal to learn from.
 *
 * Guards against two ways of poisoning the voice profile: trivial edits, which
 * would fill it with near-identical copies of the same article, and fragments
 * too short to show how the founder writes.
 */
export function shouldLearnFromEdit(
  original: string,
  edited: string,
  options?: { minChangedRatio?: number; minChars?: number },
): boolean {
  const minChars = options?.minChars ?? MIN_EDITED_CHARS;
  const minRatio = options?.minChangedRatio ?? MIN_CHANGED_RATIO;

  if (edited.trim().length < minChars) return false;
  // Nothing to compare against — treat it as authored, not edited.
  if (original.trim().length === 0) return false;

  return summarizeEdit(original, edited).changedRatio >= minRatio;
}

/**
 * Build the voice source for an edited draft, or null when the edit is too
 * small or too short to be worth learning from.
 *
 * `replaceExisting` keeps one source per content piece: a founder editing the
 * same article five times should teach the profile once, with their latest
 * version, not five times with five drafts.
 */
export function buildEditVoiceDocument(input: {
  contentPieceId: number;
  title: string;
  original: string;
  edited: string;
}): BrandVoiceIngestDocument | null {
  if (!shouldLearnFromEdit(input.original, input.edited)) return null;

  const summary = summarizeEdit(input.original, input.edited);

  return {
    sourceType: "user_edit",
    // Stable per piece, so repeated edits replace rather than accumulate.
    sourceUrl: `piece://${input.contentPieceId}`,
    title: input.title,
    text: input.edited,
    metadata: {
      contentPieceId: input.contentPieceId,
      changedRatio: Number(summary.changedRatio.toFixed(3)),
      addedWords: summary.addedWords,
      removedWords: summary.removedWords,
      // A hand-corrected draft describes the voice better than scraped pages.
      weight: 2,
    },
    replaceExisting: true,
  };
}

/**
 * Record a founder's edit as a brand voice source and re-index.
 *
 * Best effort: an edit is saved whether or not the voice profile learns from
 * it. Failing to learn is worth a log line, never a failed save.
 *
 * The baseline is the previously stored body, not the original AI draft, since
 * nothing persists the pre-edit generation. In practice the first substantial
 * edit is what teaches the profile; later tweaks fall below the threshold and
 * are skipped, which is the intent — the stored source is already close to the
 * founder's voice by then.
 *
 * @returns true when a voice source was written.
 */
export async function learnFromPieceEdit(input: {
  projectId: number;
  contentPieceId: number;
  title: string;
  previousBody: string;
  editedBody: string;
}): Promise<boolean> {
  try {
    const document = buildEditVoiceDocument({
      contentPieceId: input.contentPieceId,
      title: input.title,
      original: input.previousBody,
      edited: input.editedBody,
    });
    if (!document) return false;

    const sourceIds = await ingestBrandVoiceDocuments(input.projectId, [document]);
    if (sourceIds.length === 0) return false;

    await enqueueBrandVoiceIndex(input.projectId, sourceIds, { regenerateSkill: true });

    logger.info(
      { projectId: input.projectId, contentPieceId: input.contentPieceId },
      "Learned brand voice from founder edit",
    );
    return true;
  } catch (err) {
    logger.warn(
      { err, projectId: input.projectId, contentPieceId: input.contentPieceId },
      "Could not learn from edit; the edit itself was saved",
    );
    return false;
  }
}
