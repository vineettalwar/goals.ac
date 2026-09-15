import { and, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  briefsTable,
  contentPiecesTable,
  websiteProjectsTable,
  SOCIAL_FORMAT_TYPES,
  type ContentFormatType,
} from "@workspace/db";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ContentGeneratePayload, PgBoss } from "@workspace/jobs";
import {
  generateFromContentItem,
  type GenerateFromItemResult,
} from "@workspace/content-engine/strategy/autopilot-orchestrator";
import { generateContentPiece } from "@workspace/content-engine/content/content-studio-generator";
import {
  loopMetaFromRun,
  runResearchThenDraftLoop,
  studioDraftFromKeyword,
  UNATTENDED_AGENT_LOOP_CAPS,
} from "@workspace/content-engine/agent-loop";
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
  shouldAutoPublishSocial,
  todayInTimezone,
} from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import { isPieceAwaitingReview } from "@workspace/content-engine/verticals/vertical-guardrails";
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

export async function finalizeGeneratedPieces(params: {
  pieceIds: number[];
  projectId: number;
  userId: number;
  autoPublish: boolean;
  livePublish?: boolean;
}): Promise<void> {
  const { pieceIds, projectId, userId, autoPublish, livePublish } = params;
  if (pieceIds.length === 0) return;

  const [project] = await db
    .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const settings = parseAutopilotSettings(project?.autopilotSettings);
  const today = todayInTimezone(settings.timezone);

  if (autoPublish) {
    const pieces = await db
      .select({
        id: contentPiecesTable.id,
        formatType: contentPiecesTable.formatType,
        plannedDate: contentPiecesTable.plannedDate,
        approvalStatus: contentPiecesTable.approvalStatus,
        pieceMetadata: contentPiecesTable.pieceMetadata,
      })
      .from(contentPiecesTable)
      .where(inArray(contentPiecesTable.id, pieceIds));

    /**
     * Live autopilot publish needs grounded research. Pieces whose loop found
     * no verified GSC/keyword/competitor rows stay at ready instead of hitting the CMS.
     */
    const missingResearch = livePublish
      ? pieces.filter((piece) => piece.pieceMetadata?.researchConnected === false)
      : [];
    const heldIds = new Set(missingResearch.map((piece) => piece.id));
    if (missingResearch.length > 0) {
      logger.info(
        { pieceIds: missingResearch.map((piece) => piece.id), projectId },
        "holding live auto-publish: no research data connected",
      );
    }

    /**
     * Regulated verticals (law, dental) generate as `pending_review` and carry
     * `requiresReview` in their metadata. The publish call itself already refuses
     * these, but letting them through to here would queue a job that can only fail,
     * which reads to the firm as a broken pipeline rather than as content waiting on
     * them. Hold them at draft instead and let approvePiece release them.
     */
    const awaitingReview = pieces.filter(isPieceAwaitingReview);
    const releasable = pieces.filter(
      (piece) => !awaitingReview.some((held) => held.id === piece.id) && !heldIds.has(piece.id),
    );

    if (releasable.length > 0) {
      await db
        .update(contentPiecesTable)
        .set({ status: "ready" })
        .where(inArray(contentPiecesTable.id, releasable.map((piece) => piece.id)));
    }

    if (awaitingReview.length > 0) {
      logger.info(
        { pieceIds: awaitingReview.map((piece) => piece.id), projectId },
        "holding pieces from auto-publish until a human approves them",
      );
    }

    const publishSocialNow = shouldAutoPublishSocial(settings);
    const socialHeld: number[] = [];

    for (const piece of releasable) {
      if (!piece.plannedDate || piece.plannedDate > today) continue;

      const isSocial = (SOCIAL_FORMAT_TYPES as readonly string[]).includes(piece.formatType);
      if (isSocial && !publishSocialNow) {
        // Social platforms have no server-side draft: publishMode "draft" means
        // hold the piece for human approval, the same review state used for
        // regulated-vertical content (approvePiece releases it, and the review
        // gate in social-publish.ts refuses to post a pending_review piece).
        // Stamp scheduledAt now so the scheduled sweep's listDueSocialPieces
        // picks it up as soon as it is approved, instead of it staying stranded.
        await db
          .update(contentPiecesTable)
          .set({ approvalStatus: "pending_review", scheduledAt: new Date() })
          .where(eq(contentPiecesTable.id, piece.id));
        socialHeld.push(piece.id);
        continue;
      }

      await enqueue(QUEUES.contentPublish, { contentPieceId: piece.id, userId });
    }

    if (socialHeld.length > 0) {
      logger.info(
        { pieceIds: socialHeld, projectId },
        "holding social pieces from auto-publish (draft mode) until a human approves them",
      );
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

    const angleHint =
      typeof piece.pieceMetadata?.contentAngle === "string" ? piece.pieceMetadata.contentAngle : undefined;

    const generatedHolder: { value?: Awaited<ReturnType<typeof generateContentPiece>> } = {};
    const loop = await runResearchThenDraftLoop({
      projectId,
      userId,
      keyword: piece.targetKeyword ?? "",
      contentPieceId,
      caps: UNATTENDED_AGENT_LOOP_CAPS,
      plannerMode: "deterministic",
      generateDraft: async () => {
        const out = await studioDraftFromKeyword({
          projectId,
          userId,
          format: piece.formatType as ContentFormatType,
          keyword: piece.targetKeyword ?? "",
          angleHint,
          bypassCache: true,
          userApiKey: options.userApiKey,
          aiProviderOptions: options.aiProviderOptions,
        });
        generatedHolder.value = out.generated;
        return {
          ...out.tool,
          data: { ...(typeof out.tool.data === "object" && out.tool.data ? out.tool.data : {}), contentPieceId },
        };
      },
    });

    const generated = generatedHolder.value;
    if (!generated) {
      throw new Error(loop.stopReason ?? "Agent loop did not produce a draft");
    }

    const wordCount = generated.body_markdown.split(/\s+/).filter(Boolean).length;

    const [latest] = await db
      .select({ pieceMetadata: contentPiecesTable.pieceMetadata })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, contentPieceId))
      .limit(1);
    const latestMeta = latest?.pieceMetadata ?? {};
    const finalMeta = {
      ...latestMeta,
      ...(generated.pieceMetadata ?? {}),
      ...loopMetaFromRun(loop),
    };

    await db
      .update(contentPiecesTable)
      .set({
        title: generated.title || piece.title,
        bodyMarkdown: generated.body_markdown,
        wordCount,
        status: "draft",
        pieceMetadata: finalMeta,
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
    const { contentItemId, contentPieceId, projectId, userId, generateVariants, schedulePublish, triggeredByAutopilot } = payload;
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
          userApiKey,
          aiProviderOptions,
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
    await finalizeGeneratedPieces({
      pieceIds,
      projectId,
      userId,
      autoPublish,
      livePublish: settings.publishMode === "live",
    });

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

    if (triggeredByAutopilot === true) {
      await db
        .update(websiteProjectsTable)
        .set({
          autopilotSettings: {
            ...settings,
            lastRunAt: new Date().toISOString(),
          },
        })
        .where(eq(websiteProjectsTable.id, projectId));
    }

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
