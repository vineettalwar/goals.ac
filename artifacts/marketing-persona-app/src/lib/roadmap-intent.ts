export const ROADMAP_INTENT_KEY = "roadmap_intent";
export const GROWTH_ROADMAPS_PATH = "/strategy/roadmaps";
export const HOME_ROADMAP_REFERRER = "home-roadmap-generator";
export const ROADMAPS_PAGE_REFERRER = "roadmaps-page-generator";

export type RoadmapIntent = {
  industry: string;
  location: string;
  stage: string;
  referrer?: string;
};

export function saveRoadmapIntent(intent: RoadmapIntent): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ROADMAP_INTENT_KEY, JSON.stringify(intent));
}

export function readRoadmapIntent(): RoadmapIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ROADMAP_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RoadmapIntent>;
    if (!parsed.industry || !parsed.location || !parsed.stage) return null;
    return {
      industry: parsed.industry,
      location: parsed.location,
      stage: parsed.stage,
      referrer: parsed.referrer,
    };
  } catch {
    return null;
  }
}

export function clearRoadmapIntent(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ROADMAP_INTENT_KEY);
}

export function postOnboardingRedirect(): string {
  return readRoadmapIntent() ? GROWTH_ROADMAPS_PATH : "/dashboard";
}

export function resolvePostLoginRedirect(nextParam?: string | null): string {
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    return nextParam;
  }
  if (readRoadmapIntent()) return GROWTH_ROADMAPS_PATH;
  return "/dashboard";
}

export function buildAuthRedirectParams(referrer?: string): URLSearchParams {
  const params = new URLSearchParams({ next: GROWTH_ROADMAPS_PATH });
  if (referrer) params.set("from", referrer);
  return params;
}

export function resolveSignupReferrer(fromParam?: string | null): string | undefined {
  const fromQuery = fromParam?.trim();
  if (fromQuery) return fromQuery;
  return readRoadmapIntent()?.referrer;
}
