import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";
import {
  formatProjectUrl,
  formatTimestamp,
  type ContentPiece,
  type WebsiteProjectDetail,
} from "@/types/api";

export function ProjectDetailPage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<WebsiteProjectDetail | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    void (async () => {
      try {
        const [projectRow, pieceRows] = await Promise.all([
          apiFetch<WebsiteProjectDetail>(`/api/website-projects/${id}`),
          apiFetch<ContentPiece[]>(`/api/website-projects/${id}/content-pieces`),
        ]);
        setProject(projectRow);
        setPieces(pieceRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      }
    })();
  }, [user, id]);

  if (loading) return <p className="p-8 text-(--muted)">Loading…</p>;
  if (error) {
    return (
      <div className="px-8 py-8 max-w-4xl">
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <Link to="/projects" className="text-sm text-(--forest) font-medium">
          ← Back to projects
        </Link>
      </div>
    );
  }
  if (!project) return <p className="p-8 text-(--muted)">Loading project…</p>;

  const industry = project.brandProfile?.industry?.trim();

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link to="/projects" className="text-sm text-(--muted) hover:text-(--forest)">
        ← Projects
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-1">{project.name}</h1>
      <p className="text-sm text-(--muted) mb-6">
        <a href={project.url} target="_blank" rel="noreferrer" className="hover:text-(--forest)">
          {formatProjectUrl(project)}
        </a>
        {industry ? ` · ${industry}` : null}
        {" · Updated "}
        {formatTimestamp(project.updatedAt)}
      </p>

      <section className="grid gap-3 sm:grid-cols-3 mb-8">
        <ActionCard to={`/integrations?project=${project.id}`} label="Integrations" hint="CMS & analytics" />
        <ActionCard to={`/studio?project=${project.id}`} label="Content studio" hint={`${pieces.length} pieces`} />
        <ActionCard to="/settings" label="Settings" hint="Account & API keys" />
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Content pieces</h2>
        <div className="rounded-xl border border-(--border) bg-white divide-y">
          {pieces.length === 0 ? (
            <p className="p-4 text-sm text-(--muted)">No content for this project yet.</p>
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
    </div>
  );
}

function ActionCard({ to, label, hint }: { to: string; label: string; hint: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-(--border) bg-white p-4 hover:border-(--forest) transition-colors"
    >
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs text-(--muted) mt-1">{hint}</p>
    </Link>
  );
}
