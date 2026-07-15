export type ContentPieceDetail = {
  id: number;
  websiteProjectId: number;
  title: string;
  status: string;
  formatType: string;
  wordCount: number;
  targetKeyword?: string | null;
  updatedAt: number | string;
  bodyMarkdown?: string | null;
};

export type ContentPieceGeneratingState = {
  message: string;
  jobStatus?: string | null;
  jobId?: string | null;
};

export function formatContentFormatType(formatType: string): string {
  return formatType.replace(/_/g, " ");
}

export function formatContentPieceUpdatedAt(value: number | string | undefined): string {
  if (value == null) return "—";
  const ms = typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** SPA studio list back link (not the Next.js project-scoped content studio route). */
export function contentStudioBackHref(projectId: number | string): string {
  return `/studio?project=${projectId}`;
}

export function contentPieceCanPublish(status: string): boolean {
  return status === "ready";
}

export function contentPieceCanGenerate(status: string): boolean {
  return status === "draft" || status === "pending" || status === "failed";
}
