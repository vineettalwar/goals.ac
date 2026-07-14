import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand-context-loader";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/user-ai-provider";
import { createMultiPlatformBundle } from "@workspace/content-engine/support/social-queue-service";
import { isValidSocialPlatform } from "@workspace/content-engine/platform-voice";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { z } from "zod";

const ComposerBody = z.object({
  parentPieceId: z.number().int().positive(),
  platforms: z
    .array(z.enum(["linkedin", "twitter", "instagram", "facebook", "bluesky", "mastodon"]))
    .min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (Number.isNaN(projectId)) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ComposerBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const brand = await loadBrandContextForProject(projectId);
  if (!brand) return Response.json({ error: "Brand context not found" }, { status: 404 });

  const platforms = parsed.data.platforms.filter((p) => isValidSocialPlatform(p));
  if (platforms.length === 0) {
    return Response.json({ error: "Select at least one platform" }, { status: 400 });
  }

  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId!),
    getUserAiProviderOptions(userId!),
  ]);

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "execution",
    quotaKind: "article",
    companyId: projectId,
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const pieces = await createMultiPlatformBundle({
      projectId,
      parentPieceId: parsed.data.parentPieceId,
      platforms,
      brand,
      userApiKey,
      aiProviderOptions,
    });

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "social_composer",
      usedByok: billingPrep.usedByok,
      tier: "execution",
      companyId: projectId,
    });

    return Response.json({
      pieces: pieces.map((p) => ({
        ...p,
        scheduledAt: p.scheduledAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, err instanceof Error ? err.message : "social_composer_failed");
    const message = err instanceof Error ? err.message : "Composer failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
