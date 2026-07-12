"use client";

import { AlertCircle, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ScrapeFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

interface ScrapeStatusHeaderProps {
  isScraping: boolean;
  wasAutoFilled: boolean;
  scrapeFailed: boolean;
  onRescan?: () => void;
  rescraping?: boolean;
  lastUpdated?: string | null;
  title: string;
  description: string;
}

export function ScrapeStatusHeader({
  isScraping,
  wasAutoFilled,
  scrapeFailed,
  onRescan,
  rescraping,
  lastUpdated,
  title,
  description,
}: ScrapeStatusHeaderProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">Last updated {lastUpdated}</p>
          )}
        </div>
        {onRescan && !isScraping && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRescan}
            disabled={rescraping}
            className="shrink-0 gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-scan website
          </Button>
        )}
      </div>

      {isScraping && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-400/20 bg-blue-500/7 px-4 py-3">
          <Spinner size="sm" className="text-blue-500 dark:text-blue-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-500 dark:text-blue-400">
              Analyzing your website…
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reading your homepage and key pages to pre-fill your brand profile. This takes about
              15–30 seconds.
            </p>
          </div>
        </div>
      )}

      {wasAutoFilled && !isScraping && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/7 px-4 py-3">
          <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Review each field, add competitor URLs manually, then save.
          </p>
        </div>
      )}

      {scrapeFailed && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-red-400/20 bg-red-500/7 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-500 dark:text-red-400">Website scan failed</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              We couldn&apos;t read your website. Fill in the fields manually, or try re-scanning.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
