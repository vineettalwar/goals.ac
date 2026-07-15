/**
 * Shared content-piece action wiring — Next/Vite paths share request shapes
 * and user-facing result copy so Queue social / humanize / enhance cannot diverge.
 */

export const QUEUE_SOCIAL_PLATFORMS = ["linkedin", "twitter"] as const;

export type QueueSocialPlatform =
  | (typeof QUEUE_SOCIAL_PLATFORMS)[number]
  | "facebook"
  | "instagram";

export type QueueSocialComposerOptions = {
  /** True when Meta (Facebook/Instagram) CMS integration is connected. */
  metaConnected?: boolean;
  /**
   * True when the article has a public http(s) featured/stock/markdown image.
   * Visual-summary PNG data URIs do not count — Instagram Graph needs a fetchable URL.
   */
  hasImage?: boolean;
};

/** Shown when Meta is connected but Instagram is omitted from Queue social. */
export const QUEUE_SOCIAL_INSTAGRAM_SKIPPED_MESSAGE =
  "Instagram skipped — needs a public HTTPS featured image (stock). Visual-summary PNGs are in-app only.";

const QUEUE_SOCIAL_LABELS: Record<QueueSocialPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  facebook: "Facebook",
  instagram: "Instagram",
};

/**
 * Queue social defaults to LinkedIn + X.
 * When Meta is connected: always add Facebook; add Instagram only if a public HTTPS image exists.
 *
 * Order: generate runs stock enrich (+ visual-summary SVG→PNG on Node) before save.
 * Queue may trigger one stock enrich when Meta is connected and no HTTPS image yet.
 * Enhance applies visual summary without enrich — use Add featured / regenerate, or let Queue enrich.
 */
export function selectQueueSocialPlatforms(
  options?: QueueSocialComposerOptions,
): QueueSocialPlatform[] {
  const platforms: QueueSocialPlatform[] = [...QUEUE_SOCIAL_PLATFORMS];
  if (options?.metaConnected) {
    platforms.push("facebook");
    if (options.hasImage) {
      platforms.push("instagram");
    }
  }
  return platforms;
}

/** Meta connected but no public image → Instagram was omitted from the platform list. */
export function queueSocialInstagramSkipped(
  options?: QueueSocialComposerOptions,
): boolean {
  return Boolean(options?.metaConnected && !options.hasImage);
}

/** Accepts both app-shell (`connected: true`) and legacy presence-only snapshots. */
export function isMetaCmsConnected(
  connections: Record<string, unknown> | null | undefined,
): boolean {
  const meta = connections?.meta;
  if (!meta || typeof meta !== "object") return false;
  if ("connected" in meta) {
    return Boolean((meta as { connected?: unknown }).connected);
  }
  return true;
}

export function socialComposerPath(projectId: number | string): string {
  return `/api/website-projects/${projectId}/social/composer`;
}

export function socialHubQueuePath(projectId: number | string): string {
  return `/projects/${projectId}/social?tab=queue`;
}

export function queueSocialComposerPayload(
  parentPieceId: number,
  options?: QueueSocialComposerOptions,
): {
  parentPieceId: number;
  platforms: string[];
} {
  return {
    parentPieceId,
    platforms: selectQueueSocialPlatforms(options),
  };
}

export function formatQueueSocialSuccessMessage(
  count: number,
  platforms: readonly string[] = QUEUE_SOCIAL_PLATFORMS,
): string {
  const labels = platforms
    .map((p) => QUEUE_SOCIAL_LABELS[p as QueueSocialPlatform] ?? p)
    .join(" + ");
  return `Queued ${count} ${labels} variants`;
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
