import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";
import { formatTimestamp, type ContentPiece, type WebsiteProject } from "@/types/api";

export function StudioPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [error, setError] = useState<string | null>(null);

  const projectId = searchParams.get("project") ?? "";

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void apiFetch<WebsiteProject[]>("/api/website-projects")
      .then((rows) => {
        setProjects(rows);
        if (!projectId && rows[0]) {
          setSearchParams({ project: String(rows[0].id) }, { replace: true });
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects"));
  }, [user, projectId, setSearchParams]);

  useEffect(() => {
    if (!user || !projectId) return;
    void apiFetch<ContentPiece[]>(`/api/website-projects/${projectId}/content-pieces`)
      .then(setPieces)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load content"));
  }, [user, projectId]);

  const activeProject = useMemo(
    () => projects.find((p) => String(p.id) === projectId) ?? null,
    [projects, projectId],
  );

  if (loading) return <p className="p-8 text-(--muted)">Loading…</p>;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Content studio</h1>
      <p className="text-sm text-(--muted) mb-6">
        Browse and open drafts for a project. Full generation and calendar views are coming to the
        edge app — use local dev for the complete studio.
      </p>

      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}

      {projects.length > 0 ? (
        <label className="block text-sm mb-6 max-w-md">
          <span className="mb-1 block font-medium">Project</span>
          <select
            value={projectId}
            onChange={(e) => setSearchParams({ project: e.target.value })}
            className="h-10 w-full rounded-lg border border-(--border) px-3 bg-white"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {activeProject ? (
        <p className="text-sm text-(--muted) mb-4">
          Showing content for <span className="font-medium text-(--ink)">{activeProject.name}</span>
        </p>
      ) : null}

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
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{piece.title}</p>
                <p className="text-xs text-(--muted) mt-0.5">
                  {piece.formatType.replace(/_/g, " ")} · {piece.wordCount} words ·{" "}
                  {formatTimestamp(piece.updatedAt)}
                </p>
              </div>
              <span className="text-xs text-(--muted) uppercase shrink-0">{piece.status}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
