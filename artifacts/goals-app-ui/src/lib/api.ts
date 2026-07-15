import { setBaseUrl } from "@workspace/api-client-react";

type DeployStage = "production" | "staging" | "development";

const STAGE_APP_ORIGINS: Record<DeployStage, string> = {
  production: "https://app.goals.ac",
  staging: "https://goals-ac-app.pages.dev",
  development: "http://localhost:3001",
};

function resolveDeployStage(): DeployStage {
  const explicit = import.meta.env.VITE_DEPLOY_STAGE?.trim().toLowerCase();
  if (explicit === "production" || explicit === "staging" || explicit === "development") {
    return explicit;
  }
  if (import.meta.env.DEV) return "development";
  return "production";
}

function appOriginFromHost(host: string): string | null {
  if (host === "app.goals.ac") return STAGE_APP_ORIGINS.production;
  if (host.endsWith(".goals-ac-app.pages.dev")) return `https://${host}`;
  if (host === "localhost" || host === "127.0.0.1") {
    return import.meta.env.VITE_APP_URL?.trim().replace(/\/+$/, "") || STAGE_APP_ORIGINS.development;
  }
  return null;
}

export function getAppOrigin(): string {
  const configured = import.meta.env.VITE_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const fromHost = appOriginFromHost(window.location.hostname);
    if (fromHost) return fromHost;
  }

  return STAGE_APP_ORIGINS[resolveDeployStage()];
}

const apiBase =
  import.meta.env.VITE_API_URL?.trim()?.replace(/\/+$/, "") ||
  (import.meta.env.DEV ? "" : "https://api.goals.ac");

setBaseUrl(apiBase || null);

export function getApiBase(): string {
  return apiBase;
}

/** Abort hung requests so auth/studio loading cannot stick forever. */
const API_FETCH_TIMEOUT_MS = 15_000;

/** Long AI passes (humanize, enhance) need more than the default. */
const API_FETCH_AI_TIMEOUT_MS = 120_000;

export type ApiFetchInit = RequestInit & {
  /** Override default request timeout (ms). */
  timeoutMs?: number;
};

export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const { timeoutMs = API_FETCH_TIMEOUT_MS, signal: upstreamAbort, ...rest } = init ?? {};
  const url = path.startsWith("http") ? path : `${apiBase}${path}`;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const onUpstreamAbort = () => timeoutController.abort();
  if (upstreamAbort) {
    if (upstreamAbort.aborted) {
      timeoutController.abort();
    } else {
      upstreamAbort.addEventListener("abort", onUpstreamAbort, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...rest,
      signal: timeoutController.signal,
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(rest.headers ?? {}),
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        (body &&
          typeof body === "object" &&
          "message" in body &&
          typeof body.message === "string" &&
          body.message) ||
        (body && typeof body === "object" && "error" in body && String(body.error)) ||
        `HTTP ${response.status}`;
      throw new Error(message);
    }
    if (response.status === 204) return null as T;
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (upstreamAbort) {
      upstreamAbort.removeEventListener("abort", onUpstreamAbort);
    }
  }
}

export { API_FETCH_AI_TIMEOUT_MS };

export function authLoginUrl(): string {
  return `${getAppOrigin()}/login`;
}
