import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Search, X } from "lucide-react";
import { cn } from "../cn";

export type StockPickerPhoto = {
  provider: "unsplash" | "pexels";
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  description?: string;
  rankScore: number;
};

export type StockImagePickerRole = "featured" | "inline";

export function StockImagePickerDialog({
  open,
  onClose,
  role,
  initialQuery,
  sectionHeadings = [],
  searching = false,
  attaching = false,
  photos,
  error = null,
  onSearch,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  role: StockImagePickerRole;
  initialQuery: string;
  sectionHeadings?: string[];
  searching?: boolean;
  attaching?: boolean;
  photos: StockPickerPhoto[];
  error?: string | null;
  onSearch: (query: string) => void | Promise<void>;
  onSelect: (photo: StockPickerPhoto, sectionHeading?: string) => void | Promise<void>;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [sectionHeading, setSectionHeading] = useState(sectionHeadings[0] ?? "");
  const busy = searching || attaching;

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setSectionHeading(sectionHeadings[0] ?? "");
  }, [open, initialQuery, sectionHeadings]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="paper-card flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-picker-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id="stock-picker-title" className="text-lg font-semibold">
              {role === "featured" ? "Choose featured image" : "Insert inline image"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Unsplash / Pexels source URLs only — compressed and uploaded to your CMS on publish.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
            onClick={onClose}
            disabled={attaching}
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-3 border-b border-border px-5 py-3">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              if (!query.trim() || busy) return;
              void onSearch(query.trim());
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                disabled={busy}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stock photos…"
                className="h-9 w-full rounded-lg border border-input bg-card pl-8 pr-3 text-sm"
                aria-label="Stock photo search"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !query.trim()}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Search className="h-3.5 w-3.5" aria-hidden />
              )}
              Search
            </button>
          </form>

          {role === "inline" && sectionHeadings.length > 0 ? (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
              <span className="shrink-0">Insert after</span>
              <select
                value={sectionHeading}
                disabled={busy}
                onChange={(event) => setSectionHeading(event.target.value)}
                className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-2 text-xs text-foreground"
              >
                {sectionHeadings.map((heading) => (
                  <option key={heading} value={heading}>
                    {heading}
                  </option>
                ))}
                <option value="">End of article</option>
              </select>
            </label>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {!error && photos.length === 0 && !searching ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" aria-hidden />
              <p className="text-sm">Search Unsplash or Pexels to pick an image.</p>
            </div>
          ) : null}

          {searching && photos.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Searching…
            </div>
          ) : null}

          {photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo) => (
                <button
                  key={`${photo.provider}:${photo.id}`}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void onSelect(photo, role === "inline" ? sectionHeading || undefined : undefined)
                  }
                  className={cn(
                    "group overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary disabled:opacity-50",
                  )}
                >
                  <img
                    src={photo.previewUrl}
                    alt={photo.description || `${photo.provider} photo`}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                  />
                  <div className="space-y-0.5 p-2">
                    <p className="truncate text-xs font-medium">
                      {photo.photographer || photo.provider}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {photo.provider}
                      {photo.rankScore ? ` · ${photo.rankScore.toFixed(2)}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {attaching ? (
          <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Attaching source URL…
          </div>
        ) : null}
      </div>
    </div>
  );
}
