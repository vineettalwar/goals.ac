/**
 * Shared content-piece action wiring — Next/Vite paths share request shapes
 * and user-facing result copy so Queue social / humanize / enhance cannot diverge.
 */

export const QUEUE_SOCIAL_PLATFORMS = ["linkedin", "twitter"] as const;

export function socialComposerPath(projectId: number | string): string {
  return `/api/website-projects/${projectId}/social/composer`;
}

export function socialHubQueuePath(projectId: number | string): string {
  return `/projects/${projectId}/social?tab=queue`;
}

export function queueSocialComposerPayload(parentPieceId: number): {
  parentPieceId: number;
  platforms: string[];
} {
  return {
    parentPieceId,
    platforms: [...QUEUE_SOCIAL_PLATFORMS],
  };
}

export function formatQueueSocialSuccessMessage(count: number): string {
  return `Queued ${count} LinkedIn + X variants`;
}

export type HumanizeAuditSnapshot = {
  slopScoreBefore?: number;
  slopScoreAfter?: number;
  rejected?: boolean;
  reason?: string;
};

export type HumanizeActionResult = {
  humanized?: boolean;
  audit?: HumanizeAuditSnapshot | null;
};

/** Normalize humanize API shapes (top-level audit vs pieceMetadata.humanizationAudit). */
export function humanizeAuditFromResponse(response: {
  humanized?: boolean;
  audit?: HumanizeAuditSnapshot | null;
  pieceMetadata?: { humanizationAudit?: HumanizeAuditSnapshot | null } | null;
}): HumanizeActionResult {
  return {
    humanized: response.humanized,
    audit: response.audit ?? response.pieceMetadata?.humanizationAudit ?? null,
  };
}

export function formatHumanizeResultMessage(result: HumanizeActionResult): string {
  const audit = result.audit;
  if (audit?.rejected) {
    return "Humanization skipped — structure preserved.";
  }
  if (result.humanized) {
    if (audit?.slopScoreBefore != null && audit?.slopScoreAfter != null) {
      return `Humanized — AI tells ${audit.slopScoreBefore} → ${audit.slopScoreAfter}`;
    }
    return "Humanized.";
  }
  return "No changes needed — draft already reads naturally.";
}

export function formatEnhanceSuccessMessage(): string {
  return "Quality enhanced.";
}

export function formatEnhanceFailureMessage(error?: string | null): string {
  return error?.trim() || "Enhancement failed";
}
