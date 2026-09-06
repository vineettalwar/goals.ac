/** Subset of the gsc_url_inspections row returned by the API. */
export type GscUrlInspection = {
  id: number;
  contentPieceId: number | null;
  publishRecordId: number | null;
  inspectionUrl: string;
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  googleCanonical: string | null;
  lastCrawlTime: string | null;
  inspectedAt: string;
  errorMessage: string | null;
};

export type GscInspectionsResponse = { inspections: GscUrlInspection[] };

/** Fetch all GSC URL inspections for a project (latest-first). */
export async function fetchGscInspections(
  projectId: string,
): Promise<GscUrlInspection[]> {
  const res = await fetch(`/api/website-projects/${projectId}/gsc-url-inspections`);
  if (!res.ok) return [];
  const data = (await res.json()) as GscInspectionsResponse;
  return data.inspections ?? [];
}

/**
 * Trigger a new GSC URL inspection and return the queued row id.
 * Returns null on error.
 */
export async function triggerGscInspection(
  projectId: string,
  payload: {
    url: string;
    contentPieceId?: number;
    publishRecordId?: number;
  },
): Promise<number | null> {
  const res = await fetch(`/api/website-projects/${projectId}/gsc-url-inspections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, async: true }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: number };
  return data.id ?? null;
}

/**
 * Build a lookup map from URL → latest GscUrlInspection.
 * When multiple rows share the same URL, keeps the most-recent one
 * (assumes API returns newest-first).
 */
export function buildInspectionUrlMap(
  inspections: GscUrlInspection[],
): Map<string, GscUrlInspection> {
  const map = new Map<string, GscUrlInspection>();
  for (const insp of inspections) {
    if (!map.has(insp.inspectionUrl)) {
      map.set(insp.inspectionUrl, insp);
    }
  }
  return map;
}

/**
 * Build a lookup map from contentPieceId → latest GscUrlInspection.
 */
export function buildInspectionPieceMap(
  inspections: GscUrlInspection[],
): Map<number, GscUrlInspection> {
  const map = new Map<number, GscUrlInspection>();
  for (const insp of inspections) {
    if (insp.contentPieceId != null && !map.has(insp.contentPieceId)) {
      map.set(insp.contentPieceId, insp);
    }
  }
  return map;
}
