export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function generateRoadmapSlug(industry: string, location: string, stage: string): string {
  const base = `${slugifyText(industry)}-${slugifyText(location)}`;
  return stage === "seed" ? base : `${base}-${slugifyText(stage)}`;
}
