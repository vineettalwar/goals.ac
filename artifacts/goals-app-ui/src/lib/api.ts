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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${apiBase}${path}`;
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body && typeof body === "object" && "error" in body && String(body.error)) ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export function authLoginUrl(): string {
  return `${getAppOrigin()}/login`;
}
