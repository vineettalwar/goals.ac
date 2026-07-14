import type { StockPhoto, StockPhotoOrientation } from "./types";

type UnsplashSearchResult = {
  results?: Array<{
    id: string;
    width: number;
    height: number;
    description?: string | null;
    alt_description?: string | null;
    likes?: number;
    urls?: { regular?: string; small?: string; full?: string };
    links?: { download_location?: string };
    user?: { name?: string; links?: { html?: string } };
    tags?: Array<{ title?: string }>;
  }>;
};

function mapOrientation(orientation?: StockPhotoOrientation): string | undefined {
  if (!orientation) return "landscape";
  return orientation;
}

export async function searchUnsplash(
  query: string,
  options?: { orientation?: StockPhotoOrientation; perPage?: number; accessKey?: string },
): Promise<StockPhoto[]> {
  const accessKey = options?.accessKey?.trim() || process.env["UNSPLASH_ACCESS_KEY"];
  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY is not configured");
  }

  const params = new URLSearchParams({
    query: query.trim(),
    per_page: String(Math.min(30, options?.perPage ?? 15)),
    orientation: mapOrientation(options?.orientation) ?? "landscape",
    content_filter: "high",
  });

  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Unsplash API error: ${res.status}${text ? ` — ${text.slice(0, 120)}` : ""}`);
  }

  const data = (await res.json()) as UnsplashSearchResult;
  return (data.results ?? []).map((photo) => ({
    provider: "unsplash" as const,
    id: photo.id,
    url: photo.urls?.full ?? photo.urls?.regular ?? "",
    previewUrl: photo.urls?.small ?? photo.urls?.regular ?? "",
    width: photo.width,
    height: photo.height,
    photographer: photo.user?.name ?? "Unknown",
    photographerUrl: photo.user?.links?.html ?? "https://unsplash.com",
    description: photo.description ?? photo.alt_description ?? undefined,
    tags: photo.tags?.map((t) => t.title ?? "").filter(Boolean),
    likes: photo.likes,
  }));
}

/** Unsplash API guideline: trigger download tracking when a photo is selected. */
export async function trackUnsplashDownload(photoId: string, accessKey?: string): Promise<void> {
  const key = accessKey?.trim() || process.env["UNSPLASH_ACCESS_KEY"];
  if (!key) return;
  try {
    await fetch(`https://api.unsplash.com/photos/${photoId}/download`, {
      headers: { Authorization: `Client-ID ${key}` },
    });
  } catch {
    // best-effort
  }
}
