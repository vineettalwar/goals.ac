import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema-sqlite";
import type { AutopilotSettings } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import { z } from "zod";
import { ownedProject } from "./project-access";

const autopilotSettingsBody = z.object({
  enabled: z.boolean().optional(),
  cadence: z.enum(["daily", "weekly"]).optional(),
  timezone: z.string().min(1).optional(),
  publishMode: z.enum(["manual", "draft", "live"]).optional(),
  preferredRunHour: z.number().int().min(0).max(23).optional(),
  autoQueueOpportunities: z.boolean().optional(),
  opportunityScoreThreshold: z.number().int().min(0).max(100).optional(),
});

export async function handleAutopilotSettingsWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/autopilot-settings$/);
  if (!match || request.method !== "PATCH") {
    return null;
  }

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await ownedProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const parsed = autopilotSettingsBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const current = parseAutopilotSettings(project.autopilotSettings);
  const updated: AutopilotSettings = { ...current, ...parsed.data };

  await db
    .update(websiteProjectsTable)
    .set({ autopilotSettings: updated })
    .where(eq(websiteProjectsTable.id, projectId));

  return withCors(request, Response.json(updated));
}
