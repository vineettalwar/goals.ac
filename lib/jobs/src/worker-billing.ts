import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/user-ai-provider";
import {
  cancelAiBillingSession,
  completeAiBillingSession,
  prepareAiBillingSession,
  type AiBillingContext,
  type AiTier,
  type QuotaKind,
} from "@workspace/billing";

async function userUsesByok(userId: number): Promise<boolean> {
  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);
  if (userApiKey) return true;
  return Boolean(
    aiProviderOptions.bedrock?.accessKeyId && aiProviderOptions.bedrock?.secretAccessKey,
  );
}

export async function resolveProjectOwnerUserId(projectId: number): Promise<number | null> {
  const [project] = await db
    .select({ userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  return project?.userId ?? null;
}

export interface WorkerBillingSession {
  ctx: AiBillingContext;
  usedByok: boolean;
}

export async function prepareWorkerAiBilling(input: {
  userId: number;
  tier: AiTier;
  quotaKind?: QuotaKind;
}): Promise<{ ok: true; session: WorkerBillingSession } | { ok: false; reason: string }> {
  const usedByok = await userUsesByok(input.userId);
  const result = await prepareAiBillingSession({
    userId: input.userId,
    tier: input.tier,
    usedByok,
    quotaKind: usedByok ? undefined : input.quotaKind,
  });

  if (!result.ok) {
    return { ok: false, reason: result.error.reason };
  }

  return { ok: true, session: { ctx: result.ctx, usedByok } };
}

export async function completeWorkerAiBilling(
  session: WorkerBillingSession,
  usage: {
    userId: number;
    eventType: string;
    companyId?: number;
    promptTokens?: number;
    outputTokens?: number;
  },
): Promise<void> {
  await completeAiBillingSession(session.ctx, {
    userId: usage.userId,
    eventType: usage.eventType,
    usedByok: session.usedByok,
    tier: session.ctx.tier,
    companyId: usage.companyId,
    promptTokens: usage.promptTokens,
    outputTokens: usage.outputTokens,
  });
}

export async function cancelWorkerAiBilling(
  session: WorkerBillingSession,
  reason?: string,
): Promise<void> {
  await cancelAiBillingSession(session.ctx, reason);
}
