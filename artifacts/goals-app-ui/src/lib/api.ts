import { setBaseUrl } from "@workspace/api-client-react";

const apiBase =
  import.meta.env.VITE_API_URL?.trim()?.replace(/\/+$/, "") ||
  (import.meta.env.DEV ? "" : "https://api.goals.ac");

setBaseUrl(apiBase || null);

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
  const configured = import.meta.env.VITE_AUTH_URL?.trim();
  if (configured) return `${configured.replace(/\/$/, "")}/login`;
  if (import.meta.env.DEV) return "http://localhost:3001/login";
  return "https://goals.ac/login";
}
