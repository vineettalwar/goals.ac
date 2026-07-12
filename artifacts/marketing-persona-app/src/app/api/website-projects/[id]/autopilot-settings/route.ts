import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import type { AutopilotSettings } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot-scheduler";
import { z } from "zod";

const AutopilotSettingsBody = z.object({
  enabled: z.boolean().optional(),
  cadence: z.enum(["daily", "weekly"]).optional(),
  timezone: z.string().min(1).optional(),
  publishMode: z.enum(["manual", "draft", "live"]).optional(),
  preferredRunHour: z.number().int().min(0).max(23).optional(),
  autoQueueOpportunities: z.boolean().optional(),
  opportunityScoreThreshold: z.number().int().min(0).max(100).optional(),
});

async function loadOwnedProject(projectId: number, userId: number) {
  const [project] = await db
    .select({ id: websiteProjectsTable.id, autopilotSettings: websiteProjectsTable.autopilotSettings })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  return project ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const project = await loadOwnedProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json(parseAutopilotSettings(project.autopilotSettings));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = AutopilotSettingsBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const project = await loadOwnedProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const current = parseAutopilotSettings(project.autopilotSettings);
  const updated: AutopilotSettings = { ...current, ...parsed.data };

  await db
    .update(websiteProjectsTable)
    .set({ autopilotSettings: updated })
    .where(eq(websiteProjectsTable.id, projectId));

  return NextResponse.json(updated);
}
