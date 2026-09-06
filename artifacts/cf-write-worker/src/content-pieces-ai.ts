import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  contentPiecesTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { eq } from "drizzle-orm";
import { getAccessibleProject } from "./project-access";
import {
  handleImagesSearch,
  handleImagesAttach,
  handleImagesRegenerate,
} from "./content-pieces-ai-images";
import {
  handleSerpScore,
  handleRegenerate,
  handleEnhance,
} from "./content-pieces-ai-generate";
import {
  handleRepurpose,
  handleProjectRepurpose,
  handleProjectRefresh,
} from "./content-pieces-ai-repurpose";

export function wordCountFromMarkdown(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

export async function loadPieceForUser(contentPieceId: number, userId: number) {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, contentPieceId))
    .limit(1);

  if (!piece) return { piece: null, error: "not_found" as const };

  const project = await getAccessibleProject(piece.websiteProjectId, userId);
  if (!project) return { piece: null, error: "forbidden" as const };

  return { piece, error: null };
}

export async function loadExistingPieceTitles(projectId: number): Promise<string[]> {
  const rows = await db
    .select({ title: contentPiecesTable.title })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, projectId));
  return rows.map((row) => row.title);
}

export async function loadUserAiSettings(userId: number) {
  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);
  return { userApiKey, aiProviderOptions };
}

export async function handleContentPiecesAiWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const regenerateMatch = path.match(/^\/api\/content-pieces\/(\d+)\/regenerate$/);
  if (regenerateMatch && request.method === "POST") {
    return handleRegenerate(request, Number.parseInt(regenerateMatch[1]!, 10), userId);
  }

  const enhanceMatch = path.match(/^\/api\/content-pieces\/(\d+)\/enhance$/);
  if (enhanceMatch && request.method === "POST") {
    return handleEnhance(request, Number.parseInt(enhanceMatch[1]!, 10), userId);
  }

  const serpScoreMatch = path.match(/^\/api\/content-pieces\/(\d+)\/serp-score$/);
  if (serpScoreMatch && request.method === "GET") {
    return handleSerpScore(request, Number.parseInt(serpScoreMatch[1]!, 10), userId);
  }

  const repurposeMatch = path.match(/^\/api\/content-pieces\/(\d+)\/repurpose$/);
  if (repurposeMatch && request.method === "POST") {
    return handleRepurpose(request, Number.parseInt(repurposeMatch[1]!, 10), userId);
  }

  const repurposeStreamMatch = path.match(/^\/api\/content-pieces\/(\d+)\/repurpose\/stream$/);
  if (repurposeStreamMatch && request.method === "POST") {
    return handleRepurpose(request, Number.parseInt(repurposeStreamMatch[1]!, 10), userId);
  }

  const projectRepurposeMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/content-pieces\/repurpose$/,
  );
  if (projectRepurposeMatch && request.method === "POST") {
    return handleProjectRepurpose(request, Number.parseInt(projectRepurposeMatch[1]!, 10), userId);
  }

  const projectRefreshMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/content-pieces\/refresh$/,
  );
  if (projectRefreshMatch && request.method === "POST") {
    return handleProjectRefresh(request, Number.parseInt(projectRefreshMatch[1]!, 10), userId);
  }

  const imagesMatch = path.match(/^\/api\/content-pieces\/(\d+)\/images\/regenerate$/);
  if (imagesMatch && request.method === "POST") {
    return handleImagesRegenerate(request, Number.parseInt(imagesMatch[1]!, 10), userId);
  }

  const imagesSearchMatch = path.match(/^\/api\/content-pieces\/(\d+)\/images\/search$/);
  if (imagesSearchMatch && request.method === "GET") {
    return handleImagesSearch(request, Number.parseInt(imagesSearchMatch[1]!, 10), userId);
  }

  const imagesAttachMatch = path.match(/^\/api\/content-pieces\/(\d+)\/images\/attach$/);
  if (imagesAttachMatch && request.method === "POST") {
    return handleImagesAttach(request, Number.parseInt(imagesAttachMatch[1]!, 10), userId);
  }

  return null;
}
