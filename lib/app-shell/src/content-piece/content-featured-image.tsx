import { useState } from "react";
import { ImageIcon, RefreshCw } from "lucide-react";
import { cn } from "../cn";
import type { ContentPieceImageRef } from "./types";

function isHttpsImageUrl(url: string): boolean {
  return /^https:\/\//i.test(url.trim());
}

export function ContentPieceFeaturedImage({
  featuredImage,
  featuredImageUrl,
  supportsStockImages,
  stockImagesConfigured,
  regenerating = false,
  attachingUrl = false,
  onRegenerateImages,
  onAttachFeaturedImageUrl,
}: {
  featuredImage: ContentPieceImageRef | null;
  /** HTTPS URL on pieceMetadata when no stock image ref exists yet. */
  featuredImageUrl?: string | null;
  supportsStockImages: boolean;
  stockImagesConfigured: boolean;
  regenerating?: boolean;
  attachingUrl?: boolean;
  onRegenerateImages?: () => void | Promise<void>;
  onAttachFeaturedImageUrl?: (url: string) => void | Promise<void>;
}) {
  const [urlDraft, setUrlDraft] = useState("");
  const busy = regenerating || attachingUrl;
  const fallbackUrl =
    featuredImageUrl && isHttpsImageUrl(featuredImageUrl) ? featuredImageUrl.trim() : null;

  if (!supportsStockImages && !featuredImage && !fallbackUrl) return null;

  if (featuredImage) {
    const imageUrl = featuredImage.publishedUrl ?? featuredImage.remoteUrl;
    return (
      <div className="paper-card flex flex-col gap-4 rounded-xl p-4 sm:flex-row">
        <img
          src={imageUrl}
          alt={featuredImage.alt}
          title={featuredImage.title}
          className="h-32 w-full shrink-0 rounded-lg object-cover sm:w-48"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">Featured image</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{featuredImage.alt}</p>
          <p className="text-xs text-muted-foreground">
            {featuredImage.provider} · score {featuredImage.rankScore.toFixed(2)}
            {featuredImage.publishedUrl
              ? " · hosted on your site"
              : " · uploaded as compressed WebP to your site on publish"}
          </p>
          {onRegenerateImages ? (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
              disabled={busy}
              onClick={() => void onRegenerateImages()}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} aria-hidden />
              {regenerating ? "Finding image…" : "Pick another image"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (fallbackUrl) {
    return (
      <div className="paper-card flex flex-col gap-4 rounded-xl p-4 sm:flex-row">
        <img
          src={fallbackUrl}
          alt="Featured"
          className="h-32 w-full shrink-0 rounded-lg object-cover sm:w-48"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">Featured image</p>
          <p className="truncate text-xs text-muted-foreground">{fallbackUrl}</p>
          <div className="flex flex-wrap gap-2">
            {onRegenerateImages && stockImagesConfigured ? (
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                disabled={busy}
                onClick={() => void onRegenerateImages()}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", regenerating && "animate-spin")}
                  aria-hidden
                />
                {regenerating ? "Finding image…" : "Use stock image"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-card space-y-3 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Featured image</p>
          <p className="text-xs text-muted-foreground">
            {stockImagesConfigured
              ? "Search Unsplash or Pexels, or paste a public HTTPS image URL (required for Instagram)."
              : "Paste a public HTTPS image URL for Instagram, or configure stock API keys for search."}
          </p>
        </div>
      </div>
      {onAttachFeaturedImageUrl ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="url"
            inputMode="url"
            placeholder="Paste HTTPS image URL…"
            value={urlDraft}
            disabled={busy}
            onChange={(event) => setUrlDraft(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-xs"
            aria-label="HTTPS featured image URL"
          />
          <button
            type="button"
            disabled={busy || !isHttpsImageUrl(urlDraft)}
            onClick={() => void onAttachFeaturedImageUrl(urlDraft.trim())}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-input bg-card px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            Attach URL
          </button>
        </div>
      ) : null}
      {stockImagesConfigured && onRegenerateImages ? (
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          disabled={busy}
          onClick={() => void onRegenerateImages()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} aria-hidden />
          {regenerating ? "Finding image…" : "Use stock image"}
        </button>
      ) : null}
    </div>
  );
}
