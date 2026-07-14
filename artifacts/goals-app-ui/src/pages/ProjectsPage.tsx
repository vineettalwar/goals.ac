import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";
import {
  formatProjectUrl,
  formatTimestamp,
  type ContentPiece,
  type WebsiteProject,
} from "@/types/api";

export function ProjectsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void apiFetch<WebsiteProject[]>("/api/website-projects")
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects"));
  }, [user]);

  if (loading) return <p className="p-8 text-(--muted)">Loading…</p>;

  return (
    <div className="px-8 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Projects</h1>
      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}
      <div className="grid gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="block rounded-xl border border-(--border) bg-white p-4 hover:border-(--forest)"
          >
            <p className="font-semibold">{project.name}</p>
            <p className="text-sm text-(--muted) mt-1">
              {formatProjectUrl(project)} · Updated {formatTimestamp(project.updatedAt)}
            </p>
          </Link>
        ))}
        {projects.length === 0 ? (
          <p className="text-sm text-(--muted)">No projects yet.</p>
        ) : null}
      </div>
    </div>
  );
}

// Re-export types used by dashboard
export type { ContentPiece, WebsiteProject };
