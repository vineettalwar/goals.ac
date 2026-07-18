import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import {
  llmVisibilityPromptsTable,
  websiteProjectsTable,
  type VisibilitySettings,
} from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { parseVisibilitySettings } from "@workspace/content-engine/support/settings/visibility-settings";
import {
  seedPromptsForProject,
  runVisibilityCheckForProject,
} from "@workspace/content-engine/strategy/llm-visibility-service";
import { getAccessibleProject } from "./project-access";

const visibilitySettingsBody = z.object({
  llmTrackingEnabled: z.boolean().optional(),
  geoReauditEnabled: z.boolean().optional(),
});

export async function handleVisibilityWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const visibilitySettingsMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/visibility-settings$/,
  );
  if (visibilitySettingsMatch && request.method === "PATCH") {
    const projectId = Number.parseInt(visibilitySettingsMatch[1]!, 10);
    const parsed = visibilitySettingsBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const current = parseVisibilitySettings(project.visibilitySettings);
    const updated: VisibilitySettings = { ...current, ...parsed.data };

    await db
      .update(websiteProjectsTable)
      .set({ visibilitySettings: updated })
      .where(eq(websiteProjectsTable.id, projectId));

    if (updated.llmTrackingEnabled && !current.llmTrackingEnabled) {
      const existing = await db
        .select({ id: llmVisibilityPromptsTable.id })
        .from(llmVisibilityPromptsTable)
        .where(eq(llmVisibilityPromptsTable.websiteProjectId, projectId))
        .limit(1);
      if (existing.length === 0) {
        await seedPromptsForProject(projectId);
      }
    }

    return withCors(request, Response.json(updated));
  }

  // Next uses POST /visibility; Vite/legacy uses POST /visibility/check.
  const visibilityActionMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/visibility(?:\/check)?$/,
  );
  if (visibilityActionMatch && request.method === "POST") {
    const projectId = Number.parseInt(visibilityActionMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const body = await request.json().catch(() => ({}));
    // /visibility/check with no body defaults to check; /visibility requires an action.
    const isCheckAlias = path.endsWith("/check");
    const action = (body as { action?: string }).action ?? (isCheckAlias ? "check" : undefined);

    if (action === "seed") {
      const count = await seedPromptsForProject(projectId);
      return withCors(request, Response.json({ seeded: count }));
    }

    if (action === "reseed") {
      const count = await seedPromptsForProject(projectId, { replace: true });
      return withCors(request, Response.json({ seeded: count }));
    }

    if (action === "check") {
      try {
        const result = await runVisibilityCheckForProject(projectId);
        return withCors(request, Response.json(result));
      } catch (err) {
        return withCors(
          request,
          Response.json(
            { error: err instanceof Error ? err.message : "Check failed" },
            { status: 502 },
          ),
        );
      }
    }

    return withCors(request, Response.json({ error: "Unknown action" }, { status: 400 }));
  }

  return null;
}
