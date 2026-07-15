import { ImageIcon, RefreshCw } from "lucide-react";
import { cn } from "../cn";
import type { ContentPieceImageRef } from "./types";

export function ContentPieceFeaturedImage({
  featuredImage,
  supportsStockImages,
  stockImagesConfigured,
  regenerating = false,
  onRegenerateImages,
}: {
  featuredImage: ContentPieceImageRef | null;
  supportsStockImages: boolean;
  stockImagesConfigured: boolean;
  regenerating?: boolean;
  onRegenerateImages?: () => void | Promise<void>;
}) {
  if (!supportsStockImages && !featuredImage) return null;

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
              disabled={regenerating}
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
              ? "Search Unsplash or Pexels for a copyright-free photo. On publish, we download, compress to WebP, and upload it to your site."
              : "Stock photo search is unavailable until platform API keys are configured."}
          </p>
        </div>
      </div>
      {stockImagesConfigured && onRegenerateImages ? (
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          disabled={regenerating}
          onClick={() => void onRegenerateImages()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} aria-hidden />
          {regenerating ? "Finding image…" : "Add featured image"}
        </button>
      ) : null}
    </div>
  );
}
