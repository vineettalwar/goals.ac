import type { OrgVertical } from "@workspace/db/schema";
import type { AiProviderClient } from "@workspace/ai-providers/client";
import {
  findForbiddenClaims,
  getVerticalPreset,
  verticalRequiresReview,
  type ForbiddenClaimHit,
} from "./vertical-presets";
import { logger } from "../core/logger";

/**
 * Appends the vertical's disclaimer to a body, when the vertical defines one (law,
 * dental) and it is not already present. Idempotent — safe to call twice on the
 * same body (e.g. once per guardrail retry pass).
 */
export function appendVerticalDisclaimer(
  body: string,
  vertical: OrgVertical | null | undefined,
): string {
  const preset = getVerticalPreset(vertical);
  if (!preset.disclaimer) return body;
  if (body.includes(preset.disclaimer.slice(0, 40))) return body;
  return `${body.trim()}\n\n---\n\n*${preset.disclaimer}*`;
}

export interface VerticalGuardrailResult {
  body: string;
  /** Hits remaining after the (at most one) regeneration pass. Non-empty means the
   * draft was NOT silently passed — a reviewer must resolve these before publish. */
  hits: ForbiddenClaimHit[];
  regenerated: boolean;
}

/**
 * Scans a draft body for the vertical's forbidden claim patterns. On a hit, retries
 * once via `regenerate` with the offending claims named — cheap relative to a full
 * redraft — then re-scans the result. Never silently drops a hit: whatever survives
 * the retry (or the original hits, if the retry itself fails) is returned for the
 * caller to attach to the draft.
 */
export async function applyForbiddenClaimsGuardrail(
  body: string,
  vertical: OrgVertical | null | undefined,
  regenerate: (hits: ForbiddenClaimHit[], previousBody: string) => Promise<string | null>,
): Promise<VerticalGuardrailResult> {
  const hits = findForbiddenClaims(body, vertical);
  if (hits.length === 0) return { body, hits, regenerated: false };

  logger.warn(
    { vertical, claims: hits.map((h) => h.claim) },
    "Vertical forbidden-claim guardrail hit; retrying generation once",
  );

  const revised = await regenerate(hits, body).catch((err: unknown) => {
    logger.warn({ err, vertical }, "Forbidden-claims regeneration pass failed");
    return null;
  });
  if (!revised) return { body, hits, regenerated: false };

  const remaining = findForbiddenClaims(revised, vertical);
  if (remaining.length > 0) {
    logger.warn(
      { vertical, claims: remaining.map((h) => h.claim) },
      "Forbidden claims survived the regeneration pass; flagging for reviewer",
    );
  }
  return { body: revised, hits: remaining, regenerated: true };
}

/** Builds the fix-up prompt for the single cheap regeneration pass. */
export function buildForbiddenClaimsFixPrompt(hits: ForbiddenClaimHit[], body: string): string {
  const claims = [...new Set(hits.map((h) => h.claim))].map((c) => `"${c}"`).join(", ");
  return `Rewrite the article body below so it no longer contains any of these forbidden claims: ${claims}.
Keep the meaning, structure, headings, citations, and length intact — only remove or rephrase the flagged claims into compliant language (e.g. prefer "may", "often", "in many cases" over absolute promises).
Return ONLY the corrected markdown body. No JSON, no commentary, no code fences.

${body}`;
}

/** Convenience wrapper around applyForbiddenClaimsGuardrail using an AI client directly. */
export async function regenerateBodyWithoutForbiddenClaims(
  ai: AiProviderClient,
  hits: ForbiddenClaimHit[],
  body: string,
): Promise<string | null> {
  const response = await ai.generate({
    prompt: buildForbiddenClaimsFixPrompt(hits, body),
    maxOutputTokens: 8192,
    thinkingBudget: 0,
  });
  const revised = response.text?.trim();
  return revised && revised.length > 200 ? revised : null;
}

export interface AutoPublishGateResult {
  allowed: boolean;
  vertical: OrgVertical | null;
  requiresReview: boolean;
  /** Human-readable reason when `allowed` is false — for logs and error surfaces. */
  reason?: string;
}

/**
 * The single source of truth for "is this project's content allowed to auto-publish
 * right now". Fails closed: when the vertical cannot be determined (no org, or org
 * has no vertical set), it is treated as requiring review — the same as law/dental.
 *
 * Callers that decide whether to auto-publish MUST route through this rather than
 * checking autopilot settings alone. Every gated call site is documented in
 * `docs/prd/production-firm-onboarding.md` Stream D's implementation report.
 */
export function resolveAutoPublishGate(
  vertical: OrgVertical | null | undefined,
  autopilotAllowsPublish: boolean,
): AutoPublishGateResult {
  if (vertical === null || vertical === undefined) {
    return {
      allowed: false,
      vertical: null,
      requiresReview: true,
      reason: "Vertical could not be determined for this org — failing closed, treating as requires-review.",
    };
  }
  const requiresReview = verticalRequiresReview(vertical);
  if (requiresReview) {
    return {
      allowed: false,
      vertical,
      requiresReview: true,
      reason: `${getVerticalPreset(vertical).label} content requires human review before publishing.`,
    };
  }
  return { allowed: autopilotAllowsPublish, vertical, requiresReview: false };
}

/**
 * Piece-level review gate, read off a stored row rather than derived from the org's
 * vertical. Generation stamps `approvalStatus: "pending_review"` and
 * `pieceMetadata.requiresReview` on regulated-vertical pieces; approval clears them.
 * Either signal alone holds the piece, so a row written by an older generation path
 * that set only one of the two is still caught.
 */
export function isPieceAwaitingReview(piece: {
  approvalStatus?: string | null;
  pieceMetadata?: { requiresReview?: boolean } | null;
}): boolean {
  return piece.approvalStatus === "pending_review" || piece.pieceMetadata?.requiresReview === true;
}
