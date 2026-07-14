import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/user-ai-provider";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { z } from "zod";
import {
  analyzeAllPlatformChannels,
  analyzePlatformVoiceChannel,
  isValidChannel,
  isValidSocialPlatform,
  PLATFORM_CHANNELS,
} from "@workspace/content-engine/platform-voice";

const AnalyzeBody = z.object({
  channel: z.string().optional(),
  allChannels: z.boolean().optional(),
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

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = AnalyzeBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const [brandProfile] = await db
    .select({ platformVoices: brandProfilesTable.platformVoices })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);
  if (!brandProfile) return Response.json({ error: "Brand profile not found" }, { status: 404 });

  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId!),
    getUserAiProviderOptions(userId!),
  ]);

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "planning",
    quotaKind: "article",
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    let platformVoices = brandProfile.platformVoices;
    if (parsed.data.allChannels) {
      platformVoices = await analyzeAllPlatformChannels({
        voices: platformVoices,
        platform: platformRaw,
        userApiKey,
        aiProviderOptions,
      });
    } else {
      const channel = parsed.data.channel ?? PLATFORM_CHANNELS[platformRaw][0];
      if (!isValidChannel(platformRaw, channel)) {
        await cancelAiBilling(billingPrep.ctx, "invalid_channel");
        return Response.json({ error: "Invalid channel for platform" }, { status: 400 });
      }
      const result = await analyzePlatformVoiceChannel({
        voices: platformVoices,
        platform: platformRaw,
        channel,
        userApiKey,
        aiProviderOptions,
      });
      platformVoices = result.voices;
    }

    const [updated] = await db
      .update(brandProfilesTable)
      .set({ platformVoices })
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "platform_voice_analysis",
      usedByok: billingPrep.usedByok,
      tier: "planning",
    });

    return Response.json({
      platform: platformRaw,
      profile: updated?.platformVoices?.[platformRaw] ?? null,
    });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "analysis_failed");
    const message = err instanceof Error ? err.message : "Analysis failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
