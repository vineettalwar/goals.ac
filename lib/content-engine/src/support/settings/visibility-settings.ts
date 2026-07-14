import {
  DEFAULT_VISIBILITY_SETTINGS,
  type VisibilitySettings,
} from "@workspace/db";

export function parseVisibilitySettings(raw: unknown): VisibilitySettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_VISIBILITY_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    llmTrackingEnabled: obj.llmTrackingEnabled === true,
    geoReauditEnabled: obj.geoReauditEnabled === true,
    lastVisibilityCheckAt:
      typeof obj.lastVisibilityCheckAt === "string" ? obj.lastVisibilityCheckAt : undefined,
    lastGeoReauditAt: typeof obj.lastGeoReauditAt === "string" ? obj.lastGeoReauditAt : undefined,
  };
}
