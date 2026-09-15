import { AlertTriangle } from "lucide-react";

/** Fallback when connection lastHealth has not recorded plugin capabilities yet. */
export const SHOPIFY_THEME_SNIPPET_REQUIRED_FALLBACK = [
  "article_metafields",
  "page_sections",
] as const;

export function readShopifyThemeSnippetRequiredFor(
  connection: Record<string, unknown> | null | undefined,
): string[] | null {
  const raw = connection?.lastHealthThemeSnippetRequiredFor;
  if (!Array.isArray(raw)) return null;
  const modes = raw.filter((m): m is string => typeof m === "string");
  return modes.length > 0 ? modes : null;
}

export function shopifyOutputModeNeedsThemeSnippet(
  outputMode: string | null | undefined,
  themeSnippetRequiredFor?: string[] | null,
): boolean {
  if (!outputMode) return false;
  const required =
    themeSnippetRequiredFor && themeSnippetRequiredFor.length > 0
      ? themeSnippetRequiredFor
      : [...SHOPIFY_THEME_SNIPPET_REQUIRED_FALLBACK];
  return required.includes(outputMode);
}

export function ShopifyThemeSnippetPreflight({
  learnHref = "/learn/shopify-theme-sections",
  className,
}: {
  /** In-app learn path (docs: docs/cms-plugins/shopify-theme-sections.md). */
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
          <p className="font-semibold">Theme snippet required for storefront</p>
          <p className="text-xs leading-relaxed opacity-90">
            Metafields and page sections write JSON the theme must render. Without the Liquid
            snippet from <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">theme-snippets/</code>,
            the Online Store may show empty or fallback HTML only.
          </p>
          <p className="text-xs">
            <a
              href={learnHref}
              className="font-medium underline underline-offset-2 hover:opacity-80"
              target="_blank"
              rel="noreferrer"
            >
              Install guide
            </a>
            <span className="opacity-70"> — also in repo docs/cms-plugins/shopify-theme-sections.md</span>
          </p>
        </div>
      </div>
    </div>
  );
}
