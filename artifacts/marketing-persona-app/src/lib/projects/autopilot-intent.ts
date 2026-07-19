export const AUTOPILOT_INTENT_KEY = "autopilot_intent";
export const AUTOPILOT_REFERRER = "content-autopilot";

export type AutopilotIntent = {
  websiteUrl: string;
  referrer?: string;
};

/** Hostname stand-in until brand scrape fills the real company name. */
export function companyNameFromUrl(websiteUrl: string): string | null {
  try {
    const host = new URL(websiteUrl).hostname.replace(/^www\./, "").trim();
    return host || null;
  } catch {
    return null;
  }
}

export function saveAutopilotIntent(intent: AutopilotIntent): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTOPILOT_INTENT_KEY, JSON.stringify(intent));
}

export function readAutopilotIntent(): AutopilotIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTOPILOT_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AutopilotIntent>;
    if (!parsed.websiteUrl?.trim()) return null;
    return {
      websiteUrl: parsed.websiteUrl.trim(),
      referrer: parsed.referrer,
    };
  } catch {
    return null;
  }
}

export function clearAutopilotIntent(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTOPILOT_INTENT_KEY);
}

export function postAutopilotOnboardingRedirect(projectId: number): string {
  return `/onboarding/fast-lane?projectId=${projectId}`;
}

export function postAutopilotCompleteRedirect(projectId: number): string {
  return `/projects/${projectId}/content-studio`;
}
