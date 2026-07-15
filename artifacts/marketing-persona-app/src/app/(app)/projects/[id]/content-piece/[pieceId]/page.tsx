import { notFound } from "next/navigation";
import { getSession } from "@/auth";
import { ContentPieceClient } from "@/components/content/content-piece-client";
import {
  loadCmsConnectionsForProject,
  loadContentPieceForUser,
  loadWebsiteProjectForUser,
} from "@/lib/server/loaders";
import { loadStockCredentialContextForProject } from "@workspace/content-engine/support/integrations/stock-credentials";
import { isStockSearchAvailable } from "@workspace/stock-images";

export default async function ProjectContentPiecePage({
  params,
}: {
  params: Promise<{ id: string; pieceId: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { id: projectIdStr, pieceId: pieceIdStr } = await params;
  const projectId = Number(projectIdStr);
  const pieceId = Number(pieceIdStr);
  if (Number.isNaN(projectId) || Number.isNaN(pieceId)) notFound();

  const userId = parseInt(session.user.id, 10);
  const piece = await loadContentPieceForUser(pieceId, userId);
  if (!piece || piece.websiteProjectId !== projectId) notFound();

  const [cmsConnections, stockCredentials, project] = await Promise.all([
    loadCmsConnectionsForProject(projectId, userId),
    loadStockCredentialContextForProject(projectId),
    loadWebsiteProjectForUser(projectId, userId),
  ]);

  const bp = project?.brandProfile;

  return (
    <ContentPieceClient
      pieceId={pieceIdStr}
      initialPiece={piece}
      initialCmsConnections={cmsConnections}
      stockImagesConfigured={isStockSearchAvailable(stockCredentials)}
      brandTailoring={
        bp
          ? {
              voiceTone: bp.voiceTone || undefined,
              brandColors: bp.brandColors ?? [],
              productOfferings: bp.productOfferings ?? [],
              doWords: bp.doWords ?? [],
            }
          : null
      }
    />
  );
}
