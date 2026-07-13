import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import type { SocialScheduleSettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { getAccessibleProject, requireSiteAdminAccess } from "@/lib/org-access";
import { parseSocialScheduleSettings } from "@workspace/content-engine/support/social-queue-service";
import { z } from "zod";

const PatchBody = z.object({
  timezone: z.string().optional(),
  bestTimeMode: z.enum(["manual", "suggested", "analytics"]).optional(),
  platforms: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (Number.isNaN(projectId)) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const [row] = await db
    .select({ socialScheduleSettings: websiteProjectsTable.socialScheduleSettings })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  return Response.json({
    settings: parseSocialScheduleSettings(row?.socialScheduleSettings),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (Number.isNaN(projectId)) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }

  const siteAdmin = await requireSiteAdminAccess(userId!);
  if (!siteAdmin) {
    return Response.json({ error: "Site admin access required" }, { status: 403 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const [row] = await db
    .select({ socialScheduleSettings: websiteProjectsTable.socialScheduleSettings })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const current = parseSocialScheduleSettings(row?.socialScheduleSettings);
  const next: SocialScheduleSettings = {
    ...current,
    ...(parsed.data.timezone !== undefined ? { timezone: parsed.data.timezone } : {}),
    ...(parsed.data.bestTimeMode !== undefined ? { bestTimeMode: parsed.data.bestTimeMode } : {}),
    platforms: {
      ...current.platforms,
      ...(parsed.data.platforms as SocialScheduleSettings["platforms"]),
    },
  };

  const [updated] = await db
    .update(websiteProjectsTable)
    .set({ socialScheduleSettings: next })
    .where(eq(websiteProjectsTable.id, projectId))
    .returning({ socialScheduleSettings: websiteProjectsTable.socialScheduleSettings });

  return Response.json({
    settings: parseSocialScheduleSettings(updated?.socialScheduleSettings),
  });
}
