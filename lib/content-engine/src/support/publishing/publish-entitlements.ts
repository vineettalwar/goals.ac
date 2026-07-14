import type { PlanId } from "@workspace/billing/plans";
import { normalizePlanId } from "@workspace/billing/plans";
import type { WordPressEditorMode } from "./cms-integrations";

export interface PublishEntitlements {
  plan: PlanId;
  /** Org or user has BYOK AI credentials — unlocks richer publish payloads */
  hasByok: boolean;
  webhookIncludeCanonical: boolean;
  renderNativePayloads: boolean;
  wordpressEditorModes: WordPressEditorMode[];
  publicApiRateLimitPerHour: number;
  priorityPublishQueue: boolean;
}

export interface EntitlementInput {
  plan?: string | null;
  hasByok?: boolean;
}

const STARTER_MODES: WordPressEditorMode[] = ["classic", "gutenberg"];
const BYOK_MODES: WordPressEditorMode[] = ["classic", "gutenberg", "elementor", "divi"];

/** Resolve publish/render entitlements from org plan and BYOK status. */
export function resolvePublishEntitlements(input: EntitlementInput): PublishEntitlements {
  const plan = normalizePlanId(input.plan);
  const hasByok = Boolean(input.hasByok);
  const isEnhanced = hasByok || plan === "growth" || plan === "scale";

  return {
    plan,
    hasByok,
    webhookIncludeCanonical: isEnhanced,
    renderNativePayloads: isEnhanced,
    wordpressEditorModes: isEnhanced ? BYOK_MODES : STARTER_MODES,
    publicApiRateLimitPerHour: isEnhanced ? 600 : 60,
    priorityPublishQueue: isEnhanced,
  };
}

export function assertEditorModeAllowed(
  mode: WordPressEditorMode,
  entitlements: PublishEntitlements,
): WordPressEditorMode {
  if (entitlements.wordpressEditorModes.includes(mode)) return mode;
  return "classic";
}
