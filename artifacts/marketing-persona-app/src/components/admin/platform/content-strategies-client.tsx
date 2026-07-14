"use client";

import Link from "next/link";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Circle,
  ExternalLink,
  FolderKanban,
  Search,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLAN_LABELS, normalizePlanId } from "@/lib/billing/plans";
import { useAdminOrganizations } from "@/lib/queries";
import type {
  AdminContentStrategyDetail,
  AdminContentStrategyListRow,
} from "@/lib/admin/admin-content-strategies";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type ItemStatusFilter = "all" | "draft" | "prepared" | "published";

function formatMonthYear(month: number, year: number) {
  return `${MONTH_NAMES[(month ?? 1) - 1]} ${year}`;
}

function statusBadgeVariant(status: string): "muted" | "success" | "default" | "outline" {
  if (status === "prepared") return "success";
  if (status === "published") return "default";
  return "muted";
}

function ItemProgress({ counts }: { counts: AdminContentStrategyListRow["itemCounts"] }) {
  if (counts.total === 0) {
    return <span className="text-xs text-muted-foreground">No items</span>;
  }

  const segments = [
    { key: "draft", value: counts.draft, className: "bg-muted-foreground/40" },
    { key: "prepared", value: counts.prepared, className: "bg-emerald-500" },
    { key: "published", value: counts.published, className: "bg-primary" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={segment.className}
            style={{ width: `${(segment.value / counts.total) * 100}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {counts.draft} planned · {counts.prepared} generated · {counts.published} published
      </p>
    </div>
  );
}

function StrategyContextCard({ strategy }: { strategy: AdminContentStrategyDetail }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {formatMonthYear(strategy.month, strategy.year)} content calendar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            {strategy.industry} · {strategy.location} · {strategy.stage}
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Strategy #{strategy.id}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        <ContextRow
          icon={Building2}
          label="Organization"
          value={
            strategy.organizationId ? (
              <Link
                href={`/admin/organizations/${strategy.organizationId}`}
                className="font-medium hover:text-primary hover:underline"
              >
                {strategy.organizationName}
              </Link>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">Not linked</span>
            )
          }
          hint={
            strategy.organizationPlan
              ? PLAN_LABELS[normalizePlanId(strategy.organizationPlan)]
              : undefined
          }
        />
        <ContextRow
          icon={FolderKanban}
          label="Project"
          value={
            strategy.websiteProjectId ? (
              <span className="font-medium">{strategy.projectName}</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">No project</span>
            )
          }
          hint={strategy.projectUrl ?? undefined}
        />
        <ContextRow
          label="Owner"
          value={strategy.ownerName ?? "—"}
          hint={strategy.ownerEmail ?? undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {strategy.autopilotEnabled ? (
          <Badge variant="secondary">
            Autopilot on · publish {strategy.autopilotPublishMode}
          </Badge>
        ) : (
          <Badge variant="outline">Autopilot off</Badge>
        )}
        {!strategy.websiteProjectId && (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Cannot generate until linked to a project
          </Badge>
        )}
        {strategy.roadmapSlug && (
          <Link
            href={`/roadmap/${strategy.roadmapSlug}`}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            Roadmap <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function ContextRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: typeof Building2;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <div className="mt-0.5 truncate">{value}</div>
      {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AdminStrategyDetail({
  strategyId,
  onBack,
}: {
  strategyId: number;
  onBack: () => void;
}) {
  const [strategy, setStrategy] = useState<AdminContentStrategyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<ItemStatusFilter>("all");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/content-strategies/${strategyId}`);
    if (!res.ok) {
      setStrategy(null);
      return;
    }
    const data = (await res.json()) as { strategy: AdminContentStrategyDetail };
    setStrategy(data.strategy);
  }, [strategyId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function toggleStatus(itemId: number, currentStatus: string) {
    const newStatus = currentStatus === "prepared" ? "draft" : "prepared";
    setBusyId(itemId);
    const res = await fetch(`/api/content-strategies/${strategyId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Failed to update item");
      return;
    }
    await load();
  }

  async function generateItem(itemId: number, asyncMode: boolean) {
    setBusyId(itemId);
    const res = await fetch(`/api/content-strategies/${strategyId}/items/${itemId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ async: asyncMode }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error((body as { error?: string }).error ?? "Generation failed");
      return;
    }
    toast.success(asyncMode ? "Queued for generation" : "Generated");
    await load();
  }

  async function scheduleItem(itemId: number) {
    setBusyId(itemId);
    const res = await fetch(`/api/content-strategies/${strategyId}/items/${itemId}/schedule`, {
      method: "POST",
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error((body as { error?: string }).error ?? "Schedule failed");
      return;
    }
    toast.success("Scheduled for generation + publish");
    await load();
  }

  const filteredItems = useMemo(() => {
    if (!strategy) return [];
    const items = [...strategy.items].sort((a, b) => a.day - b.day);
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [strategy, statusFilter]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!strategy) {
    return <p className="text-muted-foreground">Strategy not found.</p>;
  }

  const counts = strategy.itemCounts;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" /> All calendars
      </Button>

      <StrategyContextCard strategy={strategy} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ItemProgress counts={counts} />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ItemStatusFilter)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items ({counts.total})</SelectItem>
            <SelectItem value="draft">Planned ({counts.draft})</SelectItem>
            <SelectItem value="prepared">Generated ({counts.prepared})</SelectItem>
            <SelectItem value="published">Published ({counts.published})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              item.status === "prepared"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : item.status === "published"
                  ? "border-primary/30 bg-primary/5"
                  : "border-border"
            }`}
          >
            <button
              type="button"
              className="mt-0.5 shrink-0"
              disabled={busyId === item.id || item.status === "published"}
              onClick={() => void toggleStatus(item.id, item.status)}
              title={
                item.status === "published"
                  ? "Published items cannot be toggled"
                  : item.status === "prepared"
                    ? "Mark as planned"
                    : "Mark as reviewed"
              }
            >
              {item.status === "prepared" || item.status === "published" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">Day {item.day}</span>
                <Badge variant="muted">{item.format}</Badge>
                <Badge variant={statusBadgeVariant(item.status)} className="capitalize">
                  {item.status === "draft" ? "planned" : item.status}
                </Badge>
              </div>
              <h4 className="text-sm font-medium">{item.title}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{item.topicAngle}</p>
              <p className="mt-1 text-xs text-primary">{item.primaryKeyword}</p>
              {item.contentPiece ? (
                <Link
                  href={contentPiecePath(strategy.websiteProjectId!, item.contentPiece.id)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary"
                >
                  View article ({item.contentPiece.status})
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === item.id || !strategy.websiteProjectId}
                onClick={() => void generateItem(item.id, false)}
              >
                <Zap className="h-3.5 w-3.5" /> Generate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === item.id || !strategy.websiteProjectId}
                onClick={() => void generateItem(item.id, true)}
              >
                Queue
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === item.id || !strategy.websiteProjectId}
                onClick={() => void scheduleItem(item.id)}
              >
                <CalendarClock className="h-3.5 w-3.5" /> Schedule
              </Button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No items match this filter.
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminStrategiesList({ onSelect }: { onSelect: (id: number) => void }) {
  const { data: organizations = [] } = useAdminOrganizations();
  const [strategies, setStrategies] = useState<AdminContentStrategyListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [organizationId, setOrganizationId] = useState("all");
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);

  const loadStrategies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (organizationId !== "all") params.set("organizationId", organizationId);
      if (unlinkedOnly) params.set("unlinkedOnly", "true");

      const res = await fetch(`/api/admin/content-strategies?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { strategies: AdminContentStrategyListRow[] };
      setStrategies(data.strategies);
    } catch {
      toast.error("Could not load content calendars");
    } finally {
      setLoading(false);
    }
  }, [search, organizationId, unlinkedOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStrategies();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadStrategies]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search org, project, owner email, industry…"
            className="pl-9"
          />
        </div>
        <Select value={organizationId} onValueChange={setOrganizationId}>
          <SelectTrigger className="lg:w-56">
            <SelectValue placeholder="All organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={String(org.id)}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={unlinkedOnly}
            onChange={(e) => setUnlinkedOnly(e.target.checked)}
            className="rounded border-border"
          />
          Unlinked only
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : strategies.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No content calendars found.</p>
      ) : (
        <div className="space-y-3">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              type="button"
              onClick={() => onSelect(strategy.id)}
              className="paper-card w-full rounded-xl p-5 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {strategy.organizationName ?? "Unlinked strategy"}
                    </p>
                    {strategy.organizationPlan ? (
                      <Badge variant="outline" className="text-[10px]">
                        {PLAN_LABELS[normalizePlanId(strategy.organizationPlan)]}
                      </Badge>
                    ) : null}
                    {!strategy.websiteProjectId && (
                      <Badge variant="warning" className="gap-1 text-[10px]">
                        <AlertTriangle className="h-3 w-3" />
                        No project
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {strategy.projectName ?? "—"}
                    {strategy.ownerEmail ? ` · ${strategy.ownerEmail}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {formatMonthYear(strategy.month, strategy.year)} · {strategy.industry} ·{" "}
                    {strategy.location} · {strategy.stage}
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <ItemProgress counts={strategy.itemCounts} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
