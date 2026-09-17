import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getSession } from "@/auth";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import {
  loadContentPieceForUser,
  loadWebsiteProjectForUser,
} from "@/lib/server/loaders";

const ContentPieceClient = dynamic(
  () => import("@/components/content/content-piece-client").then((m) => m.ContentPieceClient),
  { loading: () => <PageSkeleton /> },
);

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
  const [piece, project] = await Promise.all([
    loadContentPieceForUser(pieceId, userId),
    loadWebsiteProjectForUser(projectId, userId),
  ]);
  if (!piece || piece.websiteProjectId !== projectId) notFound();

  const bp = project?.brandProfile;
  // Platform env keys only — org/project BYOK decrypted on client when needed.
  const stockImagesConfigured = Boolean(
    process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.PEXELS_API_KEY?.trim(),
  );

  return (
    <ContentPieceClient
      pieceId={pieceIdStr}
      initialPiece={piece}
      initialCmsConnections={{}}
      stockImagesConfigured={stockImagesConfigured}
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
