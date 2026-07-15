import { and, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { briefsTable, contentPiecesTable, websiteProjectsTable, type ContentFormatType } from "@workspace/db";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ContentGeneratePayload, PgBoss } from "@workspace/jobs";
import {
  generateFromContentItem,
  type GenerateFromItemResult,
} from "@workspace/content-engine/strategy/autopilot-orchestrator";
import { generateContentPiece } from "@workspace/content-engine/content/content-studio-generator";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
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

async function generateExistingContentPiece(
  contentPieceId: number,
  projectId: number,
  userId: number,
  options: {
    userApiKey?: string | null;
    aiProviderOptions?: Awaited<ReturnType<typeof getUserAiProviderOptions>>;
  },
): Promise<GenerateFromItemResult> {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, contentPieceId))
    .limit(1);
  if (!piece) throw new Error("Content piece not found");

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  if (!project || piece.websiteProjectId !== projectId) {
    throw new Error("Project not found or access denied");
  }

  await db
    .update(contentPiecesTable)
    .set({ status: "generating" })
    .where(eq(contentPiecesTable.id, contentPieceId));

  try {
    const brand = await loadBrandContextForProject(projectId);
    if (!brand) throw new Error("Project not found");

    const generated = await generateContentPiece(
      piece.formatType as ContentFormatType,
      brand,
      piece.targetKeyword ?? "",
      undefined,
      true,
      options.userApiKey,
      options.aiProviderOptions,
    );

    const wordCount = generated.body_markdown.split(/\s+/).filter(Boolean).length;

    await db
      .update(contentPiecesTable)
      .set({
        title: generated.title || piece.title,
        bodyMarkdown: generated.body_markdown,
        wordCount,
        status: "draft",
        pieceMetadata: generated.pieceMetadata ?? null,
      })
      .where(eq(contentPiecesTable.id, contentPieceId));

    if (piece.briefId) await markBriefGenerated(piece.briefId);

    return {
      primaryPieceId: contentPieceId,
      variantPieceIds: [],
      generationUsage: generated.generationUsage,
    };
  } catch (err) {
    await db
      .update(contentPiecesTable)
      .set({ status: "failed" })
      .where(eq(contentPiecesTable.id, contentPieceId));
    throw err;
  }
}

/** Mirrors Next `markBriefGenerated` (content-pieces-helpers.ts) once real content lands. */
async function markBriefGenerated(briefId: number): Promise<void> {
  await db
    .update(briefsTable)
    .set({ status: "done", updatedAt: new Date() })
    .where(eq(briefsTable.id, briefId));
}

async function failStuckContentPiece(contentPieceId: number | undefined): Promise<void> {
  if (!contentPieceId) return;
  await db
    .update(contentPiecesTable)
    .set({ status: "failed" })
    .where(eq(contentPiecesTable.id, contentPieceId));
}

export async function processContentGenerate(payload: ContentGeneratePayload): Promise<void> {
  const {
    contentItemId,
    contentPieceId,
    projectId,
    userId,
    generateVariants,
    schedulePublish,
    triggeredByAutopilot,
  } = payload;
  if (!contentItemId && !contentPieceId) {
    throw new Error("contentItemId or contentPieceId required");
  }
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
      await failStuckContentPiece(contentPieceId);
      logger.warn(
        { contentItemId, contentPieceId, userId, reason },
        "Content generate job skipped: billing denied",
      );
      throw new Error(`billing_denied:${reason}`);
    }
    billingCtx = billingPrep.ctx;

    const genOptions = {
      userApiKey,
      aiProviderOptions,
    };
    const result = contentPieceId
      ? await generateExistingContentPiece(contentPieceId, projectId, userId, genOptions)
      : await generateFromContentItem(contentItemId!, projectId, userId, {
          ...genOptions,
          generateVariants: generateVariants !== false,
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

    logger.info({ contentItemId, contentPieceId, autoPublish, ...result }, "Content generate job completed");
  } catch (err) {
    if (billingCtx) {
      await cancelAiBillingSession(
        billingCtx,
        err instanceof Error ? err.message : "content_generate_failed",
      );
    }
    if (contentPieceId) {
      await failStuckContentPiece(contentPieceId);
    }
    logger.error({ err, contentItemId, contentPieceId }, "Content generate job failed");
    throw err;
  }
}

export async function registerContentGenerateHandler(boss: PgBoss): Promise<void> {
  await boss.work<ContentGeneratePayload>(QUEUES.contentGenerate, async ([job]) => {
    await processContentGenerate(job.data);
  });
}
