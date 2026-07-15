import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import {
  PLATFORM_CHANNELS,
  PLATFORM_LABELS,
  isValidSocialPlatform,
} from "@workspace/content-engine/platform-voice";

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

  const [brandProfile] = await db
    .select({ platformVoices: brandProfilesTable.platformVoices })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const voices = brandProfile?.platformVoices ?? {};
  const platforms = Object.keys(voices).filter((p) => isValidSocialPlatform(p));

  return Response.json({
    platformVoices: voices,
    platforms: platforms.map((id) => ({
      id,
      label: PLATFORM_LABELS[id],
      channels: PLATFORM_CHANNELS[id],
    })),
  });
}
