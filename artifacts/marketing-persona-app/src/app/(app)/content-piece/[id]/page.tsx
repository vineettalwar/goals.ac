import { notFound } from "next/navigation";
import { getSession } from "@/auth";
import { ContentPieceClient } from "@/components/content-piece-client";
import {
  loadCmsConnectionsForProject,
  loadContentPieceForUser,
} from "@/lib/server/loaders";

export default async function ContentPiecePage({
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

  const cmsConnections = await loadCmsConnectionsForProject(piece.websiteProjectId, userId);

  return (
    <ContentPieceClient
      pieceId={id}
      initialPiece={piece}
      initialCmsConnections={cmsConnections}
    />
  );
}
