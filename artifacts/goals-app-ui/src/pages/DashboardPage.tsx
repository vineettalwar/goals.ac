import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";
import {
  formatTimestamp,
  type ContentPiece,
  type WebsiteProject,
} from "@/types/api";

export function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
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
          apiFetch<WebsiteProject[]>("/api/website-projects"),
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
    return <p className="p-8 text-(--muted)">Loading…</p>;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">
        {greeting}, {user?.name?.split(" ")[0] ?? "there"}
      </h1>
      <p className="text-sm text-(--muted) mb-8">
        Connected to <code className="text-xs">api.goals.ac</code> via the edge gateway.
      </p>

      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Projects" value={String(projects.length)} />
        <StatCard label="Recent drafts" value={String(pieces.length)} />
        <StatCard label="Plan" value="Autopilot" />
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Recent content</h2>
          <Link to="/studio" className="text-xs font-medium text-(--forest)">
            Open studio
          </Link>
        </div>
        <div className="rounded-xl border border-(--border) bg-white divide-y">
          {pieces.length === 0 ? (
            <p className="p-4 text-sm text-(--muted)">No content pieces yet.</p>
          ) : (
            pieces.map((piece) => (
              <Link
                key={piece.id}
                to={`/content-piece/${piece.id}`}
                className="flex justify-between gap-4 px-4 py-3 hover:bg-[#f5f3ef]"
              >
                <span className="text-sm font-medium truncate">{piece.title}</span>
                <span className="text-xs text-(--muted) uppercase shrink-0">{piece.status}</span>
              </Link>
            ))
          )}
        </div>
      </section>

      {projects.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold mb-3">Your projects</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="rounded-xl border border-(--border) bg-white p-4 hover:border-(--forest)"
              >
                <p className="font-medium text-sm">{project.name}</p>
                <p className="text-xs text-(--muted) mt-1">
                  Updated {formatTimestamp(project.updatedAt)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-(--border) bg-white p-4">
      <p className="text-xs text-(--muted)">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
