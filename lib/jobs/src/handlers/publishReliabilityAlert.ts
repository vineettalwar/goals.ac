import { logger } from "../logger";

/**
 * Daily digest: emails super_admins when publish failures exist in the last 24h.
 * Skips silently when no failures or no Resend credentials.
 */
export async function processPublishReliabilityAlert(): Promise<void> {
  const { sendPublishReliabilityDigest } = await import(
    "@workspace/content-engine/support/publishing/publish-reliability-digest"
  );
  const result = await sendPublishReliabilityDigest({ windowHours: 24 });
  if (result.sent) {
    logger.info("Publish reliability digest sent to super_admins");
  } else {
    logger.info({ reason: result.reason }, "Publish reliability digest skipped");
  }
}

export async function registerPublishReliabilityAlertHandler(
  boss: import("@workspace/jobs").PgBoss,
): Promise<void> {
  const { QUEUES } = await import("@workspace/jobs");
  await boss.work(QUEUES.publishReliabilityAlert, async () => {
    await processPublishReliabilityAlert();
  });
}
