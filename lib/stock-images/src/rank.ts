import type { RankedStockPhoto, StockPhoto, StockPhotoOrientation } from "./types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function keywordOverlapScore(keyword: string, photo: StockPhoto): number {
  const keywordTokens = new Set(tokenize(keyword));
  if (keywordTokens.size === 0) return 0;

  const haystack = [
    photo.description ?? "",
    ...(photo.tags ?? []),
    photo.photographer,
  ]
    .join(" ")
    .toLowerCase();

  let matches = 0;
  for (const token of keywordTokens) {
    if (haystack.includes(token)) matches += 1;
  }
  return matches / keywordTokens.size;
}

function orientationScore(
  photo: StockPhoto,
  preferred: StockPhotoOrientation = "landscape",
): number {
  if (!photo.width || !photo.height) return 0.5;
  const ratio = photo.width / photo.height;
  if (preferred === "landscape") {
    if (ratio >= 1.2) return 1;
    if (ratio >= 0.9) return 0.6;
    return 0.2;
  }
  if (preferred === "portrait") {
    if (ratio <= 0.85) return 1;
    if (ratio <= 1.1) return 0.6;
    return 0.2;
  }
  if (ratio >= 0.9 && ratio <= 1.1) return 1;
  return 0.5;
}

function resolutionScore(photo: StockPhoto): number {
  const width = photo.width ?? 0;
  if (width >= 1920) return 1;
  if (width >= 1200) return 0.85;
  if (width >= 800) return 0.6;
  if (width >= 400) return 0.3;
  return 0.1;
}

function engagementScore(photo: StockPhoto): number {
  const likes = photo.likes ?? 0;
  if (likes <= 0) return 0;
  return Math.min(1, Math.log10(likes + 1) / 4);
}

export function rankStockPhotos(
  keyword: string,
  photos: StockPhoto[],
  options?: { orientation?: StockPhotoOrientation; excludeIds?: string[] },
): RankedStockPhoto[] {
  const exclude = new Set(options?.excludeIds ?? []);
  const orientation = options?.orientation ?? "landscape";

  return photos
    .filter((p) => !exclude.has(`${p.provider}:${p.id}`))
    .map((photo) => {
      const overlap = keywordOverlapScore(keyword, photo);
      const orientationFit = orientationScore(photo, orientation);
      const resolution = resolutionScore(photo);
      const engagement = engagementScore(photo);
      const rankScore =
        overlap * 0.45 + orientationFit * 0.25 + resolution * 0.2 + engagement * 0.1;
      return { ...photo, rankScore };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

export function pickBestFromRanked(ranked: RankedStockPhoto[]): RankedStockPhoto | null {
  return ranked[0] ?? null;
}
