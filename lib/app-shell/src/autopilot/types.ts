export type AutopilotCadence = "daily" | "weekly";
export type AutopilotPublishMode = "manual" | "draft" | "live";

export type AutopilotSettings = {
  enabled?: boolean;
  cadence?: AutopilotCadence;
  publishMode?: AutopilotPublishMode;
  timezone?: string;
  preferredRunHour?: number;
};

export type AutopilotSettingsSavePayload = {
  enabled: boolean;
  cadence: AutopilotCadence;
  publishMode: AutopilotPublishMode;
};

export function autopilotCadenceLabel(cadence?: string): string {
  if (cadence === "daily") return "Daily";
  if (cadence === "weekly") return "Weekly";
  return cadence ?? "Not set";
}

export function autopilotPublishModeLabel(mode?: string): string {
  if (mode === "manual") return "Manual review";
  if (mode === "draft") return "Auto-publish as draft";
  if (mode === "live") return "Auto-publish live";
  return mode ?? "Manual review";
}

export const AUTOPILOT_CADENCE_OPTIONS: Array<{ value: AutopilotCadence; label: string }> = [
  { value: "daily", label: "Daily (one article per day)" },
  { value: "weekly", label: "Weekly (one article per week)" },
];

export const AUTOPILOT_PUBLISH_MODE_OPTIONS: Array<{ value: AutopilotPublishMode; label: string }> = [
  { value: "manual", label: "Manual review (generate only)" },
  { value: "draft", label: "Auto-publish as draft" },
  { value: "live", label: "Auto-publish live" },
];
