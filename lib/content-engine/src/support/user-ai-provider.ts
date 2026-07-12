import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AiProviderOptions } from "@workspace/ai-providers";
import { logger } from "../logger";

export async function getUserAiProviderOptions(userId: number): Promise<AiProviderOptions> {
  try {
    const [user] = await db
      .select({
        aiProvider: usersTable.aiProvider,
        ollamaBaseUrl: usersTable.ollamaBaseUrl,
        ollamaModel: usersTable.ollamaModel,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return {};

    return {
      providerId:
        user.aiProvider === "gemini" ||
        user.aiProvider === "bedrock" ||
        user.aiProvider === "ollama"
          ? user.aiProvider
          : null,
      ollamaBaseUrl: user.ollamaBaseUrl,
      ollamaModel: user.ollamaModel,
    };
  } catch (err) {
    logger.warn({ err, userId }, "Failed to load user AI provider settings");
    return {};
  }
}
