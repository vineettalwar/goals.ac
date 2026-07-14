import type { ContentFormatType } from "@workspace/db";
import {
  deeplTargetLangForLanguage,
  isDeeplSupportedLanguage,
  refineContentPieceFields,
  resolveDeeplApiKey,
} from "@workspace/deepl";
import { recordUsageEvent } from "@workspace/billing";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { ContentStyle } from "@workspace/db/schema/website_projects";
import { isSeoLongformFormat } from "../content-piece-seo";
import type { BrandContext, ContentPieceResult } from "../content-studio-generator";
import { logger } from "../logger";
import { loadDeeplCredentialContextForProject } from "./deepl-credentials";

export function isDeeplRefinementEnabled(contentStyle?: ContentStyle | null): boolean {
  return contentStyle?.translationSettings?.deeplRefinementEnabled !== false;
}

export function shouldUseEnglishGenerationForDeepl(
  contentStyle: ContentStyle | null | undefined,
  deeplConfigured: boolean,
): boolean {
  const primaryLanguage = contentStyle?.primaryLanguage ?? "en";
  return (
    deeplConfigured &&
    isDeeplRefinementEnabled(contentStyle) &&
    primaryLanguage !== "en" &&
    isDeeplSupportedLanguage(primaryLanguage)
  );
}

export function buildDeeplGenerationLanguageLine(
  contentStyle: ContentStyle | null | undefined,
  deeplConfigured: boolean,
): string {
  if (!shouldUseEnglishGenerationForDeepl(contentStyle, deeplConfigured)) {
    const primaryLanguage = contentStyle?.primaryLanguage ?? "en";
    if (primaryLanguage === "en") return "";
    return `LANGUAGE: Write all content in ${primaryLanguage}.`;
  }

  const target = contentStyle?.primaryLanguage ?? "en";
  return `LANGUAGE: Write all content in English. A DeepL translation pass will localize the final draft to ${target}.`;
}

export async function maybeRefineWithDeepl(
  result: ContentPieceResult,
  brand: BrandContext,
  format: ContentFormatType,
): Promise<ContentPieceResult> {
  if (!isSeoLongformFormat(format) || !brand.projectId) {
    return result;
  }

  const contentStyle = brand.contentStyle ?? null;
  const primaryLanguage = contentStyle?.primaryLanguage ?? "en";
  if (primaryLanguage === "en" || !isDeeplRefinementEnabled(contentStyle)) {
    return result;
  }

  const targetLang = deeplTargetLangForLanguage(primaryLanguage);
  if (!targetLang) {
    logger.warn({ primaryLanguage, projectId: brand.projectId }, "DeepL refinement skipped: unsupported language");
    return result;
  }

  const credentialContext = await loadDeeplCredentialContextForProject(brand.projectId);
  const apiKey = resolveDeeplApiKey(credentialContext);
  if (!apiKey) {
    return result;
  }

  const glossaryId = contentStyle?.translationSettings?.deeplGlossaryId;

  try {
    const refined = await refineContentPieceFields(
      apiKey,
      {
        title: result.title,
        bodyMarkdown: result.body_markdown,
        metaDescription: result.meta_description,
        seoTitle: result.pieceMetadata?.seoTitle,
      },
      { targetLang, glossaryId },
    );

    const [project] = await db
      .select({ userId: websiteProjectsTable.userId })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, brand.projectId))
      .limit(1);

    if (project?.userId) {
      void recordUsageEvent({
        userId: project.userId,
        eventType: "deepl_refinement",
        totalTokens: refined.charCount,
        usedByok: true,
        provider: "deepl",
        model: targetLang,
      }).catch((err) => {
        logger.warn({ err, projectId: brand.projectId }, "Failed to record DeepL usage event");
      });
    }

    return {
      ...result,
      title: refined.title,
      body_markdown: refined.bodyMarkdown,
      meta_description: refined.metaDescription ?? result.meta_description,
      pieceMetadata: {
        ...result.pieceMetadata,
        seoTitle: refined.seoTitle ?? result.pieceMetadata?.seoTitle,
        deeplRefined: true,
        deeplTargetLang: targetLang,
      },
    };
  } catch (err) {
    logger.warn({ err, projectId: brand.projectId, targetLang }, "DeepL refinement failed; keeping AI draft");
    return result;
  }
}
