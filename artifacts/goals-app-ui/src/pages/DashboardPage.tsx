import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";

type Project = {
  id: number;
  name: string;
  websiteUrl: string | null;
  updatedAt: string;
};

type ContentPiece = {
  id: number;
  title: string;
  status: string;
  updatedAt: string;
};

export function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const [projectRows, pieceRows] = await Promise.all([
          apiFetch<Project[]>("/api/website-projects"),
          apiFetch<ContentPiece[]>("/api/content-pieces"),
        ]);
        setProjects(projectRows);
        setPieces(pieceRows.slice(0, 8));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    })();
  }, [user]);

  if (loading) {
    return <p className="p-8 text-[var(--muted)]">Loading…</p>;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">
        {greeting}, {user?.name?.split(" ")[0] ?? "there"}
      </h1>
      <p className="text-sm text-[var(--muted)] mb-8">
        Connected to <code className="text-xs">api.goals.ac</code> via the edge gateway.
      </p>

      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Projects" value={String(projects.length)} />
        <StatCard label="Recent drafts" value={String(pieces.length)} />
        <StatCard label="Plan" value="Autopilot" />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Recent content</h2>
        <div className="rounded-xl border border-[var(--border)] bg-white divide-y">
          {pieces.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted)]">No content pieces yet.</p>
          ) : (
            pieces.map((piece) => (
              <div key={piece.id} className="px-4 py-3 flex justify-between gap-4">
                <span className="text-sm font-medium truncate">{piece.title}</span>
                <span className="text-xs text-[var(--muted)] uppercase">{piece.status}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
