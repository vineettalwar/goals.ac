import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ContentGeneratePayload, PgBoss } from "@workspace/jobs";
import { generateFromContentItem } from "../services/autopilotOrchestrator";
import { getDecryptedUserGeminiKey } from "../lib/userApiKey";
import {
  parseAutopilotSettings,
  shouldAutoPublish,
  todayInTimezone,
} from "../lib/autopilotScheduler";
import { logger } from "../lib/logger";

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

export async function registerContentGenerateHandler(boss: PgBoss): Promise<void> {
  await boss.work<ContentGeneratePayload>(QUEUES.contentGenerate, async ([job]) => {
    const { contentItemId, projectId, userId, generateVariants, schedulePublish, triggeredByAutopilot } =
      job.data;
    try {
      const userApiKey = await getDecryptedUserGeminiKey(userId);
      const result = await generateFromContentItem(contentItemId, projectId, userId, {
        generateVariants: generateVariants !== false,
        userApiKey,
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

      logger.info({ contentItemId, autoPublish, ...result }, "Content generate job completed");
    } catch (err) {
      logger.error({ err, contentItemId }, "Content generate job failed");
      throw err;
    }
  });
}
