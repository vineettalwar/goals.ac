import {
  DEFAULT_AUTOPILOT_SETTINGS,
  type AutopilotSettings,
} from "@workspace/db";

export function parseAutopilotSettings(raw: unknown): AutopilotSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_AUTOPILOT_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    enabled: obj.enabled === true,
    cadence: obj.cadence === "weekly" ? "weekly" : "daily",
    timezone: typeof obj.timezone === "string" && obj.timezone.length > 0 ? obj.timezone : "UTC",
    publishMode:
      obj.publishMode === "live" || obj.publishMode === "manual" || obj.publishMode === "draft"
        ? obj.publishMode
        : "draft",
    preferredRunHour:
      typeof obj.preferredRunHour === "number"
        ? Math.min(23, Math.max(0, Math.round(obj.preferredRunHour)))
        : DEFAULT_AUTOPILOT_SETTINGS.preferredRunHour,
    lastRunAt: typeof obj.lastRunAt === "string" ? obj.lastRunAt : undefined,
    autoQueueOpportunities: obj.autoQueueOpportunities === true,
    opportunityScoreThreshold:
      typeof obj.opportunityScoreThreshold === "number"
        ? Math.min(100, Math.max(0, Math.round(obj.opportunityScoreThreshold)))
        : 60,
    lastOpportunityDiscoveryAt:
      typeof obj.lastOpportunityDiscoveryAt === "string" ? obj.lastOpportunityDiscoveryAt : undefined,
    lastSemrushDiscoveryAt:
      typeof obj.lastSemrushDiscoveryAt === "string" ? obj.lastSemrushDiscoveryAt : undefined,
  };
}

function zonedParts(date: Date, timezone: string): { dateKey: string; hour: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "0";
    const hour = hourRaw === "24" ? 0 : Number(hourRaw);
    return { dateKey: `${year}-${month}-${day}`, hour };
  } catch {
    return {
      dateKey: date.toISOString().slice(0, 10),
      hour: date.getUTCHours(),
    };
  }
}

export function todayInTimezone(timezone: string, now = new Date()): string {
  return zonedParts(now, timezone).dateKey;
}

export function shouldRunAutopilot(settings: AutopilotSettings, now = new Date()): boolean {
  if (!settings.enabled) return false;

  const { dateKey, hour } = zonedParts(now, settings.timezone);
  if (hour !== settings.preferredRunHour) return false;

  if (!settings.lastRunAt) return true;

  const lastRun = new Date(settings.lastRunAt);
  if (Number.isNaN(lastRun.getTime())) return true;

  const lastParts = zonedParts(lastRun, settings.timezone);

  if (settings.cadence === "daily") {
    return lastParts.dateKey !== dateKey;
  }

  const daysBetween = Math.floor((now.getTime() - lastRun.getTime()) / (24 * 60 * 60 * 1000));
  return daysBetween >= 7;
}

export function shouldAutoPublish(settings: AutopilotSettings): boolean {
  return settings.publishMode === "draft" || settings.publishMode === "live";
}

export function wordpressPublishStatus(settings: AutopilotSettings): "draft" | "publish" {
  return settings.publishMode === "live" ? "publish" : "draft";
}
