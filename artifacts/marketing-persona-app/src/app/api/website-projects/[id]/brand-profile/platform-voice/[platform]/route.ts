import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import type { PlatformVoiceChannel } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { z } from "zod";
import {
  getOrCreatePlatformVoice,
  isValidChannel,
  isValidSocialPlatform,
  PLATFORM_CHANNELS,
  updatePlatformVoiceChannel,
} from "@workspace/content-engine/platform-voice";

const UpdateChannelBody = z.object({
  channel: z.string().optional(),
  writingExamples: z.array(z.string()).optional(),
  typicalStructure: z.string().optional(),
  hookPatterns: z.array(z.string()).optional(),
  doWords: z.array(z.string()).optional(),
  dontWords: z.array(z.string()).optional(),
  voiceTraits: z.array(z.string()).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; platform: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id, platform: platformRaw } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId) || !isValidSocialPlatform(platformRaw)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const [brandProfile] = await db
    .select({ platformVoices: brandProfilesTable.platformVoices })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const profile = getOrCreatePlatformVoice(brandProfile?.platformVoices, platformRaw);
  return Response.json({
    platform: platformRaw,
    channels: PLATFORM_CHANNELS[platformRaw],
    profile,
  });
}

export async function PUT(
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
  const parsed = UpdateChannelBody.safeParse(body);
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

  const updates: Partial<PlatformVoiceChannel> = {};
  if (parsed.data.writingExamples !== undefined) updates.writingExamples = parsed.data.writingExamples;
  if (parsed.data.typicalStructure !== undefined) updates.typicalStructure = parsed.data.typicalStructure;
  if (parsed.data.hookPatterns !== undefined) updates.hookPatterns = parsed.data.hookPatterns;
  if (parsed.data.doWords !== undefined) updates.doWords = parsed.data.doWords;
  if (parsed.data.dontWords !== undefined) updates.dontWords = parsed.data.dontWords;
  if (parsed.data.voiceTraits !== undefined) updates.voiceTraits = parsed.data.voiceTraits;

  const platformVoices = updatePlatformVoiceChannel({
    voices: brandProfile.platformVoices,
    platform: platformRaw,
    channel,
    updates,
  });

  const [updated] = await db
    .update(brandProfilesTable)
    .set({ platformVoices })
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .returning();

  return Response.json({
    platform: platformRaw,
    profile: updated?.platformVoices?.[platformRaw] ?? null,
  });
}
