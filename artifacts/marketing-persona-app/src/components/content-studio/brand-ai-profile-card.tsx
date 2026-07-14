"use client";

import { Badge } from "@/components/ui/badge";
import { ScanSearch } from "lucide-react";
import type { BrandExtract } from "@workspace/content-engine/brand/brand-extract-types";
import { formatBrandScanDiscoverySummary } from "@/lib/projects/brand-scan-summary";
import { useBrandProfile } from "@/lib/queries";

interface BrandProfileSummary {
  scrapeStatus: string;
  pageCount?: number;
  brandMemory: {
    summary?: string;
    voiceTraits?: string[];
    audienceInsights?: string[];
    lastScannedAt?: string;
    scanSources?: string[];
    confidence?: Record<string, string>;
  } | null;
  primaryKeywords: string[];
  voiceTone: string;
  discoveryMeta: BrandExtract["discoveryMeta"] | null;
  scanSources: string[];
}

export function BrandAiProfileCard({ projectId }: { projectId: string }) {
  const { data: profile } = useBrandProfile(projectId);

  if (!profile) return null;

  const typedProfile = profile as BrandProfileSummary;
  const scanning = typedProfile.scrapeStatus === "pending";
  const memory = typedProfile.brandMemory;
  const discoveryLabel = formatBrandScanDiscoverySummary(
    typedProfile.discoveryMeta,
    typedProfile.pageCount,
  );
  const scanSources =
    typedProfile.scanSources.length > 0 ? typedProfile.scanSources : (memory?.scanSources ?? []);

  return (
    <div className="paper-card mb-6 p-4 border-primary/20">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ScanSearch className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">AI-built brand profile</h2>
            {scanning && (
              <Badge variant="outline" className="text-xs">
                Scanning website…
              </Badge>
            )}
            {memory?.confidence?.summary && (
              <Badge variant="secondary" className="text-xs capitalize">
                {memory.confidence.summary} confidence
              </Badge>
            )}
          </div>
          {memory?.summary ? (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{memory.summary}</p>
          ) : typedProfile.voiceTone ? (
            <p className="mt-2 text-sm text-muted-foreground">{typedProfile.voiceTone}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              We scan your website on project create to build voice and keywords automatically.
            </p>
          )}
          {discoveryLabel && (
            <p className="mt-2 text-xs text-muted-foreground">Scanned via {discoveryLabel}</p>
          )}
          {(memory?.voiceTraits?.length ?? 0) > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {memory!.voiceTraits!.map((trait) => (
                <Badge key={trait} variant="outline" className="text-xs font-normal">
                  {trait}
                </Badge>
              ))}
            </div>
          )}
          {typedProfile.primaryKeywords.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Focus topics: {typedProfile.primaryKeywords.slice(0, 6).join(", ")}
            </p>
          )}
          {scanSources.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Pages scanned</p>
              <ul className="mt-1 space-y-0.5">
                {scanSources.slice(0, 6).map((source) => (
                  <li key={source}>
                    <a
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block"
                    >
                      {source.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
                {scanSources.length > 6 && (
                  <li className="text-xs text-muted-foreground">
                    +{scanSources.length - 6} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
