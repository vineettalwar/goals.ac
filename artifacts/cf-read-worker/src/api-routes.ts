import type { SessionClaims } from "@workspace/cf-edge/jwt";
import { handleSessionRead } from "./session-read";
import { handleWorkspaceRead } from "./workspace-read";
import { handleContentRead } from "./content-read";
import { handleAnalysisRead } from "./analysis-read";
import type { ReadWorkerEnv } from "./read-env";

export type { ReadWorkerEnv } from "./read-env";

export async function handleAuthenticatedRead(
  request: Request,
  path: string,
  userId: number,
  env: ReadWorkerEnv,
  session?: SessionClaims,
): Promise<Response | null> {
  return (
    (await handleSessionRead(request, path, userId, env, session)) ??
    (await handleWorkspaceRead(request, path, userId, env)) ??
    (await handleContentRead(request, path, userId)) ??
    (await handleAnalysisRead(request, path, userId))
  );
}
