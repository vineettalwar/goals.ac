import type { AiProviderId } from "@workspace/ai-providers/config";
import type { CmsConnectionSnapshot } from "@/lib/projects/publishing-destinations";
import type { ContentPieceRow } from "./content-studio-client";

export type StudioLoadResult = {
  projectName: string;
  aiReady: boolean | null;
  activeProvider: AiProviderId;
  pieces: Array<ContentPieceRow & { source: "studio" }>;
  cmsConnections: CmsConnectionSnapshot;
  primaryBlogDestination: string | null;
};

export async function loadContentStudioData(projectId: string): Promise<StudioLoadResult> {
  const [projRes, piecesRes, aiStatusRes, cmsRes, publishingRes] = await Promise.all([
    fetch(`/api/website-projects/${projectId}`),
    fetch(`/api/website-projects/${projectId}/content-pieces`),
    fetch("/api/ai-providers/status"),
    fetch(`/api/website-projects/${projectId}/cms-integrations`),
    fetch(`/api/website-projects/${projectId}/publishing-settings`),
  ]);

  let projectName = "";
  if (projRes.ok) {
    const proj = await projRes.json();
    projectName = proj.name ?? "";
  }

  let aiReady: boolean | null = null;
  let activeProvider: AiProviderId = "gemini";
  if (aiStatusRes.ok) {
    const status = await aiStatusRes.json();
    activeProvider = status.activeProvider ?? "gemini";
    aiReady = Boolean(status.ready);
  }

  let pieces: StudioLoadResult["pieces"] = [];
  if (piecesRes.ok) {
    const data = await piecesRes.json();
    pieces = (data.pieces ?? []).map((p: ContentPieceRow) => ({ ...p, source: "studio" as const }));
  }

  let cmsConnections: CmsConnectionSnapshot = {};
  if (cmsRes.ok) {
    cmsConnections = await cmsRes.json();
  }

  let primaryBlogDestination: string | null = null;
  if (publishingRes.ok) {
    const settings = (await publishingRes.json()) as { primaryBlogDestination?: string | null };
    primaryBlogDestination = settings.primaryBlogDestination ?? null;
  }

  return {
    projectName,
    aiReady,
    activeProvider,
    pieces,
    cmsConnections,
    primaryBlogDestination,
  };
}
