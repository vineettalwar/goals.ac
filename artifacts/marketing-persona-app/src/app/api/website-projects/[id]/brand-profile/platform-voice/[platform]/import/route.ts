import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { z } from "zod";
import {
  importFromPaste,
  isValidChannel,
  isValidSocialPlatform,
  PLATFORM_CHANNELS,
} from "@workspace/content-engine/platform-voice";

const ImportBody = z.object({
  channel: z.string().optional(),
  raw: z.string().min(20),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; platform: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id, platform: platformRaw } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId) || !isValidSocialPlatform(platformRaw)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ImportBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const channel = parsed.data.channel ?? PLATFORM_CHANNELS[platformRaw][0];
  if (!isValidChannel(platformRaw, channel)) {
    return Response.json({ error: "Invalid channel for platform" }, { status: 400 });
  }

  const [brandProfile] = await db
    .select({ platformVoices: brandProfilesTable.platformVoices })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);
  if (!brandProfile) return Response.json({ error: "Brand profile not found" }, { status: 404 });

  const platformVoices = importFromPaste({
    voices: brandProfile.platformVoices,
    platform: platformRaw,
    channel,
    raw: parsed.data.raw,
  });

  const [updated] = await db
    .update(brandProfilesTable)
    .set({ platformVoices })
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .returning();

  const profile = updated?.platformVoices?.[platformRaw];
  const sampleCount = profile?.channels[channel]?.writingExamples.length ?? 0;

  return Response.json({
    platform: platformRaw,
    channel,
    sampleCount,
    profile,
  });
}
