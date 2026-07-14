import type { StockPhoto, StockPhotoOrientation } from "./types";

type PexelsSearchResult = {
  photos?: Array<{
    id: number;
    width: number;
    height: number;
    alt?: string;
    photographer?: string;
    photographer_url?: string;
    src?: { original?: string; large2x?: string; large?: string; medium?: string };
  }>;
};

function mapOrientation(orientation?: StockPhotoOrientation): string | undefined {
  if (!orientation) return "landscape";
  return orientation;
}

export async function searchPexels(
  query: string,
  options?: { orientation?: StockPhotoOrientation; perPage?: number; apiKey?: string },
): Promise<StockPhoto[]> {
  const apiKey = options?.apiKey?.trim() || process.env["PEXELS_API_KEY"];
  if (!apiKey) {
    throw new Error("PEXELS_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    query: query.trim(),
    per_page: String(Math.min(30, options?.perPage ?? 15)),
    orientation: mapOrientation(options?.orientation) ?? "landscape",
  });

  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pexels API error: ${res.status}${text ? ` — ${text.slice(0, 120)}` : ""}`);
  }

  const data = (await res.json()) as PexelsSearchResult;
  return (data.photos ?? []).map((photo) => ({
    provider: "pexels" as const,
    id: String(photo.id),
    url: photo.src?.original ?? photo.src?.large2x ?? photo.src?.large ?? "",
    previewUrl: photo.src?.medium ?? photo.src?.large ?? "",
    width: photo.width,
    height: photo.height,
    photographer: photo.photographer ?? "Unknown",
    photographerUrl: photo.photographer_url ?? "https://www.pexels.com",
    description: photo.alt,
    tags: photo.alt ? photo.alt.split(/\s+/).filter((t) => t.length > 2) : undefined,
  }));
}
