"use client";

import { RefreshCw, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FORMAT_OPTIONS } from "@/lib/content/content-format-options";
import { cn } from "@/lib/utils";
import { FilterSelect } from "./content-studio-list-items";
import type { SortKey } from "./content-studio-utils";

export function ContentStudioHubFilters({
  filterSource,
  filterFormat,
  filterStatus,
  sortKey,
  allItems,
  statsBreakdown,
  onFilterSourceChange,
  onFilterFormatChange,
  onFilterStatusChange,
  onSortKeyChange,
  onClearFilters,
}: {
  filterSource: string;
  filterFormat: string;
  filterStatus: string;
  sortKey: SortKey;
  allItems: Array<unknown>;
  statsBreakdown: Array<{ label: string; count: number; color: string }>;
  onFilterSourceChange: (v: string) => void;
  onFilterFormatChange: (v: string) => void;
  onFilterStatusChange: (v: string) => void;
  onSortKeyChange: (v: SortKey) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={filterSource}
          onChange={onFilterSourceChange}
          ariaLabel="Filter by source"
          options={[
            { value: "all", label: "All sources" },
            { value: "studio", label: "Studio" },
            { value: "seo_article", label: "SEO Articles" },
            { value: "content_strategy", label: "Strategy Items" },
            { value: "geo_audit", label: "GEO Audits" },
            { value: "roadmap", label: "Roadmaps" },
          ]}
        />
        <FilterSelect
          value={filterFormat}
          onChange={onFilterFormatChange}
          ariaLabel="Filter by format"
          options={[
            { value: "all", label: "All formats" },
            ...FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          ]}
        />
        <FilterSelect
          value={filterStatus}
          onChange={onFilterStatusChange}
          ariaLabel="Filter by status"
          options={[
            { value: "all", label: "All statuses" },
            { value: "draft", label: "Draft" },
            { value: "ready", label: "Ready" },
            { value: "published", label: "Published" },
            { value: "prepared", label: "Prepared" },
          ]}
        />
        <FilterSelect
          value={sortKey}
          onChange={(v) => onSortKeyChange(v as SortKey)}
          ariaLabel="Sort content"
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "words_desc", label: "Most words" },
            { value: "words_asc", label: "Fewest words" },
            { value: "title_asc", label: "A → Z" },
          ]}
          icon={<ArrowUpDown className="h-3 w-3" />}
        />
        {(filterFormat !== "all" || filterStatus !== "all" || filterSource !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearFilters}>
            <RefreshCw className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {statsBreakdown.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{allItems.length} total</span>
          {statsBreakdown.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="w-px h-3 bg-border" />
              <span className={cn("font-medium", s.color)}>{s.count}</span>
              <span>{s.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
