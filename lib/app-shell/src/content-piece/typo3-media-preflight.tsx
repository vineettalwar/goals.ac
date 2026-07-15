import { AlertTriangle } from "lucide-react";

/**
 * Detect if a raster data: image (PNG/JPEG/WebP/GIF) featured image is present.
 * Does NOT warn on SVG data: URIs since those can be stored inline in TYPO3 without /media.
 */
export function hasRasterDataImage(featuredImageUrl: string | null | undefined): boolean {
  if (!featuredImageUrl || !featuredImageUrl.startsWith("data:")) return false;
  const rasterPrefixes = ["data:image/png", "data:image/jpeg", "data:image/jpg", "data:image/webp", "data:image/gif"];
  return rasterPrefixes.some((prefix) => featuredImageUrl.startsWith(prefix));
}

/**
 * Read persisted media_upload capability from health.
 * Returns false if health has not run or plugin lacks the capability.
 */
export function readTypo3MediaUploadCapable(
  connection: Record<string, unknown> | null | undefined,
): boolean {
  return Boolean(connection?.lastHealthMediaUploadCapable);
}

/**
 * Soft amber warning when publishing to TYPO3 with a raster data: featured image
 * and plugin health lacks media_upload capability (older plugin without POST /media).
 *
 * Does NOT block publish — inline FAL still works, but images will be stored as
 * base64 strings in the database instead of proper FAL references.
 */
export function Typo3MediaPreflight({
  learnHref = "#",
  className,
}: {
  /** Optional in-app learn path (if docs exist). */
  learnHref?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={
        className ??
        "rounded-lg border-2 border-amber-500/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/50 dark:bg-amber-950/40 dark:text-amber-50"
      }
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300"
          aria-hidden
        />
        <div className="space-y-1.5">
          <p className="font-semibold">Older TYPO3 plugin — no POST /media</p>
          <p className="text-xs leading-relaxed opacity-90">
            Publishing continues with inline FAL (base64 in DB). For proper FAL file references,
            upgrade the extension to the latest version with <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">POST /goals-ac/v1/media</code> support.
          </p>
          {learnHref && learnHref !== "#" ? (
            <p className="text-xs">
              <a
                href={learnHref}
                className="font-medium underline underline-offset-2 hover:opacity-80"
                target="_blank"
                rel="noreferrer"
              >
                Learn more
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
