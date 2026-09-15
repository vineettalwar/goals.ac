import {
  handleContentPieceCreateDraft,
  handleContentPieceDelete,
  handleContentPiecePatch,
} from "./content-pieces-crud";
import {
  handleContentPieceHumanize,
  handleContentPieceRevertHumanize,
} from "./content-pieces-humanize";
import { handleContentPieceGenerate, handleDailyFiveWrite } from "./content-pieces-generate";
import type { TrackJob } from "./content-pieces-shared";

export async function handleContentPiecesWrite(
  request: Request,
  path: string,
  userId: number,
  trackJob?: TrackJob,
): Promise<Response | null> {
  const dailyFiveMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/content-pieces\/daily-five$/,
  );
  if (dailyFiveMatch && request.method === "POST") {
    return handleDailyFiveWrite(
      request,
      Number.parseInt(dailyFiveMatch[1]!, 10),
      userId,
      trackJob,
    );
  }

  const generateMatch = path.match(/^\/api\/content-pieces\/(\d+)\/generate$/);
  if (generateMatch && request.method === "POST") {
    return handleContentPieceGenerate(
      request,
      Number.parseInt(generateMatch[1]!, 10),
      userId,
      trackJob,
    );
  }

  const humanizeMatch = path.match(/^\/api\/content-pieces\/(\d+)\/humanize$/);
  if (humanizeMatch && request.method === "POST") {
    return handleContentPieceHumanize(
      request,
      Number.parseInt(humanizeMatch[1]!, 10),
      userId,
    );
  }

  const revertHumanizeMatch = path.match(/^\/api\/content-pieces\/(\d+)\/humanize\/revert$/);
  if (revertHumanizeMatch && request.method === "POST") {
    return handleContentPieceRevertHumanize(
      request,
      Number.parseInt(revertHumanizeMatch[1]!, 10),
      userId,
    );
  }

  const patchMatch = path.match(/^\/api\/content-pieces\/(\d+)$/);
  if (patchMatch && request.method === "PATCH") {
    return handleContentPiecePatch(
      request,
      Number.parseInt(patchMatch[1]!, 10),
      userId,
    );
  }

  if (patchMatch && request.method === "DELETE") {
    return handleContentPieceDelete(
      request,
      Number.parseInt(patchMatch[1]!, 10),
      userId,
    );
  }

  const match = path.match(/^\/api\/website-projects\/(\d+)\/content-pieces$/);
  if (!match || request.method !== "POST") return null;

  return handleContentPieceCreateDraft(request, Number.parseInt(match[1]!, 10), userId);
}
