import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function assertAiGenerationEnabled(): Promise<void> {
  const [row] = await db
    .select({ aiGenerationEnabled: platformSettingsTable.aiGenerationEnabled })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  if (row && !row.aiGenerationEnabled) {
    throw new Error("AI services are temporarily unavailable. Please try again later.");
  }
}
