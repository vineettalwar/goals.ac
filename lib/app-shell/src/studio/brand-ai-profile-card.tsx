import { cn } from "../cn";
import { aiProviderUnavailableMessage } from "./studio-hub-utils";

export type BrandScanDiscoveryMeta = {
  sitemap?: boolean;
  gsc?: boolean;
  cms?: boolean;
  homepage?: boolean;
  sitemapUrlCount?: number;
  gscPageCount?: number;
  cmsPostCount?: number;
  /** Legacy / sparse payloads */
  method?: string;
  pagesScanned?: number;
};

export type BrandProfileSummary = {
  scrapeStatus?: string;
  pageCount?: number;
  brandMemory?: {
    summary?: string;
    voiceTraits?: string[];
    confidence?: Record<string, string>;
    scanSources?: string[];
    lastScannedAt?: string;
  } | null;
  primaryKeywords?: string[] | null;
  voiceTone?: string | null;
  discoveryMeta?: BrandScanDiscoveryMeta | null;
  scanSources?: string[];
};

function formatBrandScanDiscoverySummary(
  meta: BrandScanDiscoveryMeta | null | undefined,
  pageCount?: number,
): string | null {
  if (!meta) return null;
  const parts: string[] = [];
  if (meta.sitemap) {
    parts.push(
      meta.sitemapUrlCount
        ? `sitemap (${meta.sitemapUrlCount} URLs)`
        : pageCount
          ? `sitemap (${pageCount} pages)`
          : "sitemap",
    );
  }
  if (meta.gsc) {
    parts.push(meta.gscPageCount ? `GSC (${meta.gscPageCount} pages)` : "GSC");
  }
  if (meta.cms) {
    parts.push(meta.cmsPostCount ? `CMS (${meta.cmsPostCount} posts)` : "CMS");
  }
  if (meta.homepage) {
    parts.push("homepage links");
  }
  if (parts.length === 0 && meta.method) {
    parts.push(
      meta.pagesScanned != null ? `${meta.method} (${meta.pagesScanned} pages)` : meta.method,
    );
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

function formatLastScannedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BrandAiProfileCard({
  profile,
  loading = false,
  className,
}: {
  profile: BrandProfileSummary | null;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn("mb-6 animate-pulse border-b border-border pb-5", className)}>
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="mt-3 h-3 w-full max-w-2xl rounded bg-muted" />
      </div>
    );
  }

  if (!profile) return null;

  const scanning = profile.scrapeStatus === "pending";
  const memory = profile.brandMemory;
  const discoveryLabel = formatBrandScanDiscoverySummary(profile.discoveryMeta, profile.pageCount);
  const lastScannedLabel = formatLastScannedAt(memory?.lastScannedAt);
  const scanSources =
    (profile.scanSources?.length ?? 0) > 0
      ? profile.scanSources!
      : (memory?.scanSources ?? []);
  const summary =
    memory?.summary ||
    profile.voiceTone ||
    "Voice and focus topics come from your site scan.";
  const metaBits = [
    scanning ? "Scanning website…" : null,
    memory?.confidence?.summary ? `${memory.confidence.summary} confidence` : null,
    discoveryLabel ? `via ${discoveryLabel}` : null,
    lastScannedLabel ? `Last scanned ${lastScannedLabel}` : null,
  ].filter(Boolean);

  return (
    <div className={cn("mb-6 border-b border-border pb-5", className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-foreground">Brand voice</h2>
        {metaBits.length > 0 ? (
          <p className="text-xs text-muted-foreground">{metaBits.join(" · ")}</p>
        ) : null}
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{summary}</p>
      {(memory?.voiceTraits?.length ?? 0) > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Traits: {memory!.voiceTraits!.join(" · ")}
        </p>
      ) : null}
      {(profile.primaryKeywords?.length ?? 0) > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Focus: {profile.primaryKeywords!.slice(0, 6).join(", ")}
        </p>
      ) : null}
      {scanSources.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Pages scanned ({scanSources.length})
          </summary>
          <ul className="mt-1.5 space-y-0.5">
            {scanSources.slice(0, 6).map((source) => (
              <li key={source}>
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs text-primary hover:underline"
                >
                  {source.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ))}
            {scanSources.length > 6 ? (
              <li className="text-xs text-muted-foreground">+{scanSources.length - 6} more</li>
            ) : null}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function StudioAiReadinessBanner({
  ready,
  activeProvider,
  settingsHref = "/settings",
  renderLink,
}: {
  ready: boolean | null;
  activeProvider: string;
  settingsHref?: string;
  renderLink: (props: { href: string; className?: string; children: React.ReactNode }) => React.ReactNode;
}) {
  if (ready !== false) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
      {aiProviderUnavailableMessage(activeProvider)}{" "}
      {renderLink({
        href: settingsHref,
        className: "text-primary hover:underline",
        children: "Open AI settings",
      })}
    </div>
  );
}
