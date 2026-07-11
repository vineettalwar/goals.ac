/**
 * Installs a global `fetch` interceptor so that the whole app talks to the
 * API using httpOnly cookies instead of a JWT held in JS/localStorage:
 *
 *  - every request to this app's own `/api/*` path gets `credentials:
 *    "include"` by default, so the `access_token` / `refresh_token` cookies
 *    ride along even for callers that didn't think to set it themselves; and
 *  - a 401 from the API triggers a single `POST /api/auth/refresh` attempt,
 *    and the original request is retried exactly once if that succeeds.
 *
 * This lives at the `fetch` layer (rather than inside
 * `@workspace/api-client-react`'s customFetch) because several pages still
 * call `fetch` directly for streaming endpoints, so patching the global is
 * the one place that covers both the generated API client and those call
 * sites without touching either.
 */

export const SESSION_EXPIRED_EVENT = "goals-ac:session-expired";

const REFRESH_PATH = "/auth/refresh";
// 401s from these auth endpoints themselves should never trigger a refresh
// retry — a failed login/signup is a credentials problem, not a stale
// access token, and refresh/logout retrying themselves would just loop.
const NO_REFRESH_RETRY_PATHS = ["/auth/refresh", "/auth/login", "/auth/signup", "/auth/logout"];

let installed = false;
let refreshInFlight: Promise<boolean> | null = null;

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isApiUrl(url: string): boolean {
  try {
    const resolved = new URL(url, window.location.origin);
    return resolved.origin === window.location.origin && resolved.pathname.includes("/api/");
  } catch {
    return false;
  }
}

function isExemptFromRefresh(url: string): boolean {
  return NO_REFRESH_RETRY_PATHS.some((path) => url.includes(path));
}

async function performRefresh(originalFetch: typeof fetch): Promise<boolean> {
  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const res = await originalFetch(`${base}/api${REFRESH_PATH}`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function requestRefresh(originalFetch: typeof fetch): Promise<boolean> {
  if (!refreshInFlight) {
    // Coalesce concurrent 401s into a single refresh call.
    refreshInFlight = performRefresh(originalFetch).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export function installAuthFetchInterceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = resolveUrl(input);
    const isApi = isApiUrl(url);

    const requestInit: RequestInit = isApi
      ? { ...init, credentials: init.credentials ?? "include" }
      : init;

    const response = await originalFetch(input, requestInit);

    if (response.status !== 401 || !isApi || isExemptFromRefresh(url)) {
      return response;
    }

    const refreshed = await requestRefresh(originalFetch);
    if (!refreshed) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      return response;
    }

    return originalFetch(input, requestInit);
  };
}
