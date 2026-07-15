import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";

type AdminStrategy = {
  id: number;
  organizationName: string | null;
  projectName: string | null;
  industry: string | null;
  location: string | null;
  itemCounts: { total: number; published: number };
  createdAt: string;
};

export function AdminContentStrategiesPage() {
  const [strategies, setStrategies] = useState<AdminStrategy[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const data = await apiFetch<{ strategies: AdminStrategy[] }>(
        `/api/admin/content-strategies?${params.toString()}`,
      );
      setStrategies(data.strategies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load strategies");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content strategies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cross-org strategy pipeline visibility.</p>
      </div>
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search org, project, industry…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-border px-4 py-2 text-sm"
        >
          Search
        </button>
      </div>
      {loading ? <p className="text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Strategy</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy) => (
                <tr key={strategy.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link to={`/admin/content-strategies/${strategy.id}`} className="font-medium hover:underline">
                      #{strategy.id} {strategy.industry ?? "—"}
                    </Link>
                    <div className="text-xs text-muted-foreground">{strategy.projectName ?? "Unlinked"}</div>
                  </td>
                  <td className="px-4 py-3">{strategy.organizationName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {strategy.itemCounts.published}/{strategy.itemCounts.total} published
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(strategy.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
