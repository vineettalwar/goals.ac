import type { ContentFormatType } from "./content-studio-format-data";
import { FORMAT_OPTIONS } from "@/lib/content/content-format-options";
import type { BriefContentDraft } from "./create-content-modal";

export function draftFromCreateParams(searchParams: URLSearchParams): BriefContentDraft | null {
  if (searchParams.get("create") !== "1") return null;

  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const title = searchParams.get("title")?.trim() ?? "";
  const angle = searchParams.get("angle")?.trim() ?? "";
  const format = searchParams.get("format")?.trim();
  const validFormats = new Set<string>(FORMAT_OPTIONS.map((option) => option.value));

  if (!keyword && !title) return null;

  return {
    keyword: keyword || title,
    workingTitle: title || undefined,
    angleHint: angle || undefined,
    formatType:
      format && validFormats.has(format) ? (format as ContentFormatType) : "blog_post",
  };
}

export interface ContentPieceRow {
  id: number;
  title: string;
  formatType: string;
  targetKeyword: string;
  status: string;
  wordCount: number;
  plannedDate: string | null;
  createdAt: string;
  publishedUrl?: string | null;
  pieceMetadata?: { source?: string } | null;
}

export interface StudioPiece extends ContentPieceRow {
  source: "studio";
  isRefresh?: boolean;
}

export function isRefreshPiece(
  piece: Pick<ContentPieceRow, "pieceMetadata"> & { isRefresh?: boolean },
): boolean {
  return Boolean(piece.isRefresh || piece.pieceMetadata?.source === "refresh");
}

export type SortKey = "newest" | "oldest" | "words_desc" | "words_asc" | "title_asc";

export function filterPieces(
  pieces: StudioPiece[],
  filterStatus: string,
  filterFormat: string,
): StudioPiece[] {
  return pieces.filter((piece) => {
    if (filterStatus !== "all" && piece.status !== filterStatus) return false;
    if (filterFormat !== "all" && piece.formatType !== filterFormat) return false;
    return true;
  });
}

export function pieceStatusCounts(
  pieces: StudioPiece[],
): Array<{ label: string; count: number; color: string }> {
  return [
    { label: "Drafts", count: pieces.filter((piece) => piece.status === "draft").length, color: "text-amber-600" },
    { label: "Ready", count: pieces.filter((piece) => piece.status === "ready").length, color: "text-emerald-600" },
    {
      label: "Published",
      count: pieces.filter((piece) => piece.status === "published").length,
      color: "text-blue-600",
    },
  ].filter((row) => row.count > 0);
}

export function sortItems(items: StudioPiece[], sortKey: SortKey): StudioPiece[] {
  return [...items].sort((a, b) => {
    switch (sortKey) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "words_desc":
        return b.wordCount - a.wordCount;
      case "words_asc":
        return a.wordCount - b.wordCount;
      case "title_asc":
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
}

export function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function eachDayInMonth(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

export const WEEK_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function briefToDraft(brief: {
  id: number;
  workingTitle: string;
  targetKeywordCluster: string | null;
  angle: string | null;
  format: string | null;
}): BriefContentDraft {
  const parts = [`Title: ${brief.workingTitle}`];
  if (brief.targetKeywordCluster) parts.push(`Keywords: ${brief.targetKeywordCluster}`);
  if (brief.angle) parts.push(brief.angle);

  const formatType =
    brief.format && FORMAT_OPTIONS.some((f) => f.value === brief.format)
      ? (brief.format as ContentFormatType)
      : "blog_post";

  return {
    briefId: brief.id,
    keyword: brief.targetKeywordCluster?.trim() || brief.workingTitle,
    angleHint: parts.join("\n"),
    formatType,
    workingTitle: brief.workingTitle,
  };
}
