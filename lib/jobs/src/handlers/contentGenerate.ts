import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ContentGeneratePayload, PgBoss } from "@workspace/jobs";
import { generateFromContentItem } from "@workspace/content-engine/strategy/autopilot-orchestrator";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import {
  cancelAiBillingSession,
  completeAiBillingSession,
  prepareAiBillingSession,
  type AiBillingContext,
} from "@workspace/billing";
import {
  parseAutopilotSettings,
  shouldAutoPublish,
  todayInTimezone,
} from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import { logger } from "../logger";

function userUsesByok(
  userApiKey: string | null,
  aiProviderOptions: Awaited<ReturnType<typeof getUserAiProviderOptions>>,
): boolean {
  if (userApiKey) return true;
  return Boolean(
    aiProviderOptions.bedrock?.accessKeyId && aiProviderOptions.bedrock?.secretAccessKey,
  );
}

async function finalizeGeneratedPieces(params: {
  pieceIds: number[];
  projectId: number;
  userId: number;
  autoPublish: boolean;
}): Promise<void> {
  const { pieceIds, projectId, userId, autoPublish } = params;
  if (pieceIds.length === 0) return;

  const [project] = await db
    .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const settings = parseAutopilotSettings(project?.autopilotSettings);
  const today = todayInTimezone(settings.timezone);

  if (autoPublish) {
    await db
      .update(contentPiecesTable)
      .set({ status: "ready" })
      .where(inArray(contentPiecesTable.id, pieceIds));

    const pieces = await db
      .select({ id: contentPiecesTable.id, plannedDate: contentPiecesTable.plannedDate })
      .from(contentPiecesTable)
      .where(inArray(contentPiecesTable.id, pieceIds));

    for (const piece of pieces) {
      if (piece.plannedDate && piece.plannedDate <= today) {
        await enqueue(QUEUES.contentPublish, { contentPieceId: piece.id, userId });
      }
    }
    return;
  }

  // manual mode — pieces remain draft for human review
}

export async function processContentGenerate(payload: ContentGeneratePayload): Promise<void> {
  const { contentItemId, projectId, userId, generateVariants, schedulePublish, triggeredByAutopilot } =
    payload;
  let billingCtx: AiBillingContext | null = null;
  try {
    const [userApiKey, aiProviderOptions] = await Promise.all([
      getDecryptedUserGeminiKey(userId),
      getUserAiProviderOptions(userId),
    ]);
    const usesByok = userUsesByok(userApiKey, aiProviderOptions);

    const billingPrep = await prepareAiBillingSession({
      userId,
      tier: "execution",
      usedByok: usesByok,
      quotaKind: usesByok ? undefined : "article",
    });

    if (!billingPrep.ok) {
      const reason = billingPrep.error.reason;
      logger.warn({ contentItemId, userId, reason }, "Content generate job skipped: billing denied");
      throw new Error(`billing_denied:${reason}`);
    }
    billingCtx = billingPrep.ctx;

    const result = await generateFromContentItem(contentItemId, projectId, userId, {
      generateVariants: generateVariants !== false,
      userApiKey,
      aiProviderOptions,
    });

    const [project] = await db
      .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);

    const settings = parseAutopilotSettings(project?.autopilotSettings);
    const autoPublish =
      schedulePublish === true || (triggeredByAutopilot === true && shouldAutoPublish(settings));

    const pieceIds = [result.primaryPieceId, ...result.variantPieceIds];
    await finalizeGeneratedPieces({ pieceIds, projectId, userId, autoPublish });

    await completeAiBillingSession(billingCtx, {
      userId,
      eventType: "content_generation",
      usedByok: usesByok,
      tier: "execution",
      companyId: projectId,
      promptTokens: result.generationUsage?.promptTokens,
      outputTokens: result.generationUsage?.outputTokens,
      totalTokens: result.generationUsage?.totalTokens,
    });

    logger.info({ contentItemId, autoPublish, ...result }, "Content generate job completed");
  } catch (err) {
    if (billingCtx) {
      await cancelAiBillingSession(
        billingCtx,
        err instanceof Error ? err.message : "content_generate_failed",
      );
    }
    logger.error({ err, contentItemId }, "Content generate job failed");
    throw err;
  }
}

export async function registerContentGenerateHandler(boss: PgBoss): Promise<void> {
  await boss.work<ContentGeneratePayload>(QUEUES.contentGenerate, async ([job]) => {
    await processContentGenerate(job.data);
  });
}
