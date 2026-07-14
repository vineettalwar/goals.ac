export const ACTIVE_PROJECT_COOKIE = "activeProjectId";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function setActiveProjectCookie(projectId: number) {
  document.cookie = `${ACTIVE_PROJECT_COOKIE}=${projectId}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function clearActiveProjectCookie() {
  document.cookie = `${ACTIVE_PROJECT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
