import { ScanSearch } from "lucide-react";
import { cn } from "../cn";
import { aiProviderUnavailableMessage } from "./studio-hub-utils";

export type BrandProfileSummary = {
  scrapeStatus?: string;
  pageCount?: number;
  brandMemory?: {
    summary?: string;
    voiceTraits?: string[];
    confidence?: Record<string, string>;
    scanSources?: string[];
  } | null;
  primaryKeywords?: string[] | null;
  voiceTone?: string | null;
  discoveryMeta?: { method?: string; pagesScanned?: number } | null;
  scanSources?: string[];
};

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
      <div className={cn("paper-card mb-6 animate-pulse rounded-xl border-primary/20 p-4", className)}>
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="mt-3 h-3 w-full rounded bg-muted" />
      </div>
    );
  }

  if (!profile) return null;

  const scanning = profile.scrapeStatus === "pending";
  const memory = profile.brandMemory;
  const scanSources =
    (profile.scanSources?.length ?? 0) > 0
      ? profile.scanSources!
      : (memory?.scanSources ?? []);

  return (
    <div className={cn("paper-card mb-6 rounded-xl border-primary/20 p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ScanSearch className="h-4 w-4 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">AI-built brand profile</h2>
            {scanning ? (
              <span className="inline-flex rounded-full border border-input px-2 py-0.5 text-xs">
                Scanning website…
              </span>
            ) : null}
            {memory?.confidence?.summary ? (
              <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                {memory.confidence.summary} confidence
              </span>
            ) : null}
          </div>
          {memory?.summary ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{memory.summary}</p>
          ) : profile.voiceTone ? (
            <p className="mt-2 text-sm text-muted-foreground">{profile.voiceTone}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              We scan your website on project create to build voice and keywords automatically.
            </p>
          )}
          {(profile.primaryKeywords?.length ?? 0) > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Focus topics: {profile.primaryKeywords!.slice(0, 6).join(", ")}
            </p>
          ) : null}
          {(memory?.voiceTraits?.length ?? 0) > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {memory!.voiceTraits!.map((trait) => (
                <span
                  key={trait}
                  className="inline-flex rounded-full border border-input px-2 py-0.5 text-xs font-normal"
                >
                  {trait}
                </span>
              ))}
            </div>
          ) : null}
          {scanSources.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Pages scanned</p>
              <ul className="mt-1 space-y-0.5">
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
              </ul>
            </div>
          ) : null}
        </div>
      </div>
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
