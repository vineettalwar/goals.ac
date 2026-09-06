import { withCors } from "@workspace/cf-edge/cors";
import {
  fetchBacklinksOverview,
  isBacklinksConfigured,
} from "@workspace/serp-provider";
import { getAccessibleProject } from "./project-access";

export async function handleBacklinksWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/backlinks$/);
  if (!match || request.method !== "POST") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  if (!isBacklinksConfigured()) {
    return withCors(
      request,
      Response.json(
        {
          error:
            "Backlinks provider not configured — add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD",
          configured: false,
        },
        { status: 503 },
      ),
    );
  }

  try {
    const overview = await fetchBacklinksOverview({ target: project.url });
    return withCors(request, Response.json(overview));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backlinks fetch failed";
    return withCors(request, Response.json({ error: message }, { status: 502 }));
  }
}
