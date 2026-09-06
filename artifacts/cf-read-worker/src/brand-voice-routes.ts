import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import { brandProfilesTable } from "@workspace/db/schema-sqlite";
import {
  getBrandVoiceSkill,
} from "@workspace/content-engine/brand/brand-voice-skill";
import {
  getBrandVoiceSourceStats,
  listBrandVoiceSources,
} from "@workspace/content-engine/brand/brand-voice-indexer";
import {
  getOrCreatePlatformVoice,
  isValidSocialPlatform,
  PLATFORM_CHANNELS,
  PLATFORM_LABELS,
} from "@workspace/content-engine/platform-voice";
import { eq } from "drizzle-orm";
import { getAccessibleProject } from "./project-access";

export async function handleBrandVoiceRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;

  const skillMatch = path.match(/^\/api\/website-projects\/(\d+)\/brand-voice\/skill$/);
  if (skillMatch && method === "GET") {
    const projectId = Number.parseInt(skillMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const skill = await getBrandVoiceSkill(projectId);
    return withCors(request, Response.json(skill));
  }

  const sourcesMatch = path.match(/^\/api\/website-projects\/(\d+)\/brand-voice\/sources$/);
  if (sourcesMatch && method === "GET") {
    const projectId = Number.parseInt(sourcesMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const [sources, stats] = await Promise.all([
      listBrandVoiceSources(projectId),
      getBrandVoiceSourceStats(projectId),
    ]);
    return withCors(request, Response.json({ sources, stats }));
  }

  const platformVoiceListMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/brand-profile\/platform-voice$/,
  );
  if (platformVoiceListMatch && method === "GET") {
    const projectId = Number.parseInt(platformVoiceListMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [brandProfile] = await db
      .select({ platformVoices: brandProfilesTable.platformVoices })
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);

    const voices = brandProfile?.platformVoices ?? {};
    const platforms = Object.keys(voices).filter((platform) => isValidSocialPlatform(platform));

    return withCors(
      request,
      Response.json({
        platformVoices: voices,
        platforms: platforms.map((id) => ({
          id,
          label: PLATFORM_LABELS[id],
          channels: PLATFORM_CHANNELS[id],
        })),
      }),
    );
  }

  const platformVoiceMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/brand-profile\/platform-voice\/([^/]+)$/,
  );
  if (platformVoiceMatch && method === "GET") {
    const projectId = Number.parseInt(platformVoiceMatch[1]!, 10);
    const platformRaw = platformVoiceMatch[2]!;
    if (!isValidSocialPlatform(platformRaw)) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [brandProfile] = await db
      .select({ platformVoices: brandProfilesTable.platformVoices })
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);

    const voiceProfile = getOrCreatePlatformVoice(brandProfile?.platformVoices, platformRaw);
    return withCors(
      request,
      Response.json({
        platform: platformRaw,
        channels: PLATFORM_CHANNELS[platformRaw],
        profile: voiceProfile,
      }),
    );
  }

  return null;
}
