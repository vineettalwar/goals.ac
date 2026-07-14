import type { PgBoss } from "@workspace/jobs";
import { QUEUES } from "@workspace/jobs";
import { listEvergreenCandidates, isEvergreenDue } from "@workspace/content-engine/support/social/social-queue-service";
import { recycleEvergreenPiece } from "@workspace/content-engine/support/content/evergreen-recycle";
import { logger } from "../logger";

export const EVERGREEN_RECYCLE_SWEEP_CRON = "0 6 * * *";

export async function registerEvergreenRecycleSweepHandler(boss: PgBoss): Promise<void> {
  await boss.work(QUEUES.evergreenRecycleSweep, async () => {
    const candidates = await listEvergreenCandidates();
    let recycled = 0;
    for (const piece of candidates) {
      if (!isEvergreenDue(piece)) continue;
      const cloneId = await recycleEvergreenPiece(piece.id);
      if (cloneId) recycled += 1;
    }
    logger.info({ candidates: candidates.length, recycled }, "Evergreen recycle sweep");
  });
}
