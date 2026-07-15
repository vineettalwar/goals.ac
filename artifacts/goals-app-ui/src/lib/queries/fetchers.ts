import { apiFetch } from "@/lib/api";
import type { WebsiteProject, ContentPiece } from "@/types/api";
import type { BrandProfileSummary } from "@workspace/app-shell";

export function fetchWebsiteProjects() {
  return apiFetch<WebsiteProject[]>("/api/website-projects");
}

export function fetchProjectContentPieces(projectId: string) {
  return apiFetch<ContentPiece[]>(`/api/website-projects/${projectId}/content-pieces`);
}

export type AiProviderStatus = {
  ready?: boolean;
  activeProvider?: string;
};

export function fetchAiProviderStatus() {
  return apiFetch<AiProviderStatus>("/api/ai-providers/status");
}

export function fetchProjectBrandProfile(projectId: string) {
  return apiFetch<BrandProfileSummary>(`/api/website-projects/${projectId}/brand-profile`);
}

export type StockCredentialsStatus = {
  platform?: { configured?: boolean };
  org?: unknown[];
};

export function fetchStockCredentialsStatus() {
  return apiFetch<StockCredentialsStatus>("/api/auth/stock-credentials");
}

export function isStockImagesConfigured(status: StockCredentialsStatus | null | undefined): boolean {
  if (!status) return false;
  const orgKeys = Array.isArray(status.org) ? status.org.length > 0 : false;
  return Boolean(status.platform?.configured) || orgKeys;
}
