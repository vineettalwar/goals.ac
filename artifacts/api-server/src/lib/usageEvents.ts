import { db, usageEventsTable } from "@workspace/db";

export async function recordUsageEvent(params: {
  userId: number;
  eventType: string;
  tier?: string;
  provider?: string;
  model?: string;
  usedByok?: boolean;
}): Promise<void> {
  await db.insert(usageEventsTable).values({
    userId: params.userId,
    eventType: params.eventType,
    tier: params.tier ?? null,
    provider: params.provider ?? "gemini",
    model: params.model ?? null,
    usedByok: params.usedByok ?? false,
  });
}
