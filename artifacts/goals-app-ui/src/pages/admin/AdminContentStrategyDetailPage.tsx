import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";

type StrategyItem = {
  id: number;
  day: number;
  format: string;
  title: string;
  topicAngle: string | null;
  primaryKeyword: string | null;
  status: string;
  contentPiece: { id: number; title: string; status: string } | null;
};

type StrategyDetail = {
  id: number;
  month: number;
  year: number;
  industry: string | null;
  location: string | null;
  stage: string | null;
  organizationId: number | null;
  organizationName: string | null;
  organizationPlan: string | null;
  websiteProjectId: number | null;
  projectName: string | null;
  projectUrl: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  autopilotEnabled: boolean;
  autopilotPublishMode: string | null;
  itemCounts: { total: number; draft: number; prepared: number; published: number };
  items: StrategyItem[];
};

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

function formatMonthYear(month: number, year: number) {
  return `${MONTH_NAMES[(month ?? 1) - 1]} ${year}`;
}

export function AdminContentStrategyDetailPage({ strategyId }: { strategyId: number }) {
  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ strategy: StrategyDetail }>(
        `/api/admin/content-strategies/${strategyId}`,
      );
      setStrategy(data.strategy);
    } catch (err) {
      setStrategy(null);
      setError(err instanceof Error ? err.message : "Failed to load strategy");
    } finally {
      setLoading(false);
    }
  }, [strategyId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="p-8 text-muted-foreground">Loading strategy…</p>;
  }

  if (error || !strategy) {
    return (
      <div className="max-w-5xl space-y-4 px-8 py-8">
        <Link to="/admin/content-strategies" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to strategies
        </Link>
        <p className="text-destructive">{error ?? "Strategy not found"}</p>
      </div>
    );
  }

  const sortedItems = [...strategy.items].sort((a, b) => a.day - b.day);

  return (
    <div className="max-w-5xl space-y-6 px-8 py-8">
      <Link to="/admin/content-strategies" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to strategies
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {formatMonthYear(strategy.month, strategy.year)} calendar
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {strategy.industry ?? "—"} · {strategy.location ?? "—"} · {strategy.stage ?? "—"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Organization</p>
          <p className="mt-1 font-medium">
            {strategy.organizationId ? (
              <Link to={`/admin/organizations/${strategy.organizationId}`} className="hover:underline">
                {strategy.organizationName}
              </Link>
            ) : (
              "Unlinked"
            )}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Project</p>
          <p className="mt-1 font-medium">{strategy.projectName ?? "No project"}</p>
          {strategy.projectUrl ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{strategy.projectUrl}</p>
          ) : null}
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Owner</p>
          <p className="mt-1 font-medium">{strategy.ownerName ?? "—"}</p>
          {strategy.ownerEmail ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{strategy.ownerEmail}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border p-4 text-sm">
        <p>
          {strategy.itemCounts.draft} planned · {strategy.itemCounts.prepared} generated ·{" "}
          {strategy.itemCounts.published} published
        </p>
        <p className="mt-1 text-muted-foreground">
          Autopilot {strategy.autopilotEnabled ? `on (${strategy.autopilotPublishMode})` : "off"}
        </p>
      </div>

      <div className="space-y-2">
        {sortedItems.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">Day {item.day}</span>
              <span className="rounded bg-muted px-1.5 py-0.5">{item.format}</span>
              <span className="capitalize">{item.status === "draft" ? "planned" : item.status}</span>
            </div>
            <h3 className="text-sm font-medium">{item.title}</h3>
            {item.topicAngle ? <p className="mt-1 text-xs text-muted-foreground">{item.topicAngle}</p> : null}
            {item.primaryKeyword ? <p className="mt-1 text-xs text-primary">{item.primaryKeyword}</p> : null}
            {item.contentPiece ? (
              <Link
                to={`/content-piece/${item.contentPiece.id}`}
                className="mt-2 inline-block text-xs font-medium hover:underline"
              >
                View article ({item.contentPiece.status})
              </Link>
            ) : null}
          </div>
        ))}
        {sortedItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No calendar items.</p>
        ) : null}
      </div>
    </div>
  );
}
