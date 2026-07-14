import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";
import { formatTimestamp, type ContentPiece } from "@/types/api";

export function ContentPiecePage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [piece, setPiece] = useState<ContentPiece | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    void apiFetch<ContentPiece>(`/api/content-pieces/${id}`)
      .then(setPiece)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load content"));
  }, [user, id]);

  if (loading) return <p className="p-8 text-(--muted)">Loading…</p>;
  if (error) {
    return (
      <div className="px-8 py-8 max-w-4xl">
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <Link to="/studio" className="text-sm text-(--forest) font-medium">
          ← Content studio
        </Link>
      </div>
    );
  }
  if (!piece) return <p className="p-8 text-(--muted)">Loading…</p>;

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link
        to={`/studio?project=${piece.websiteProjectId}`}
        className="text-sm text-(--muted) hover:text-(--forest)"
      >
        ← Content studio
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">{piece.title}</h1>
      <p className="text-sm text-(--muted) mb-6">
        {piece.status} · {piece.formatType.replace(/_/g, " ")} · {piece.wordCount} words · Updated{" "}
        {formatTimestamp(piece.updatedAt)}
      </p>
      <article className="rounded-xl border border-(--border) bg-white p-6 prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm text-(--ink) leading-relaxed">
          {piece.bodyMarkdown?.trim() || "No body content stored for this piece."}
        </pre>
      </article>
    </div>
  );
}
