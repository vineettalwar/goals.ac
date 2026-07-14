import { notFound, redirect } from "next/navigation";
import { getSession } from "@/auth";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import { loadContentPieceForUser } from "@/lib/server/loaders";

/** Legacy flat URL — redirect to project-scoped route. */
export default async function LegacyContentPieceRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const pieceId = Number(id);
  if (Number.isNaN(pieceId)) notFound();

  const userId = parseInt(session.user.id, 10);
  const piece = await loadContentPieceForUser(pieceId, userId);
  if (!piece) notFound();

  redirect(contentPiecePath(piece.websiteProjectId, pieceId));
}
