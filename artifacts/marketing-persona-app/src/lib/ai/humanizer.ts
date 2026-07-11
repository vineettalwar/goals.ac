import { getAiClient } from "@workspace/ai-providers";
import { cleanAndParse } from "./utils";
import type { GoogleGenAI } from "@google/genai";
import type { GeneratedArticle } from "./article-generator";

export type HumanizationLevel = "light" | "strong";

export interface HumanizeOptions {
  level: HumanizationLevel;
  writingSample?: string;
  aiClient?: GoogleGenAI;
}

interface HumanizedOutput {
  bodyMarkdown: string;
  metaDescription: string;
  wordCount: number;
}

const SYSTEM_PROMPT = `You are a senior human editor. Your job is to rewrite AI-generated article drafts so they read like they were written by an experienced human writer — while preserving the article's SEO structure exactly.

Rewrite rules:
- Vary sentence length: mix short punchy sentences with longer ones. Break up monotonous rhythm.
- Use contractions naturally (it's, don't, you're, we've).
- Prefer concrete, specific phrasing over abstract filler.
- Use first/second person where it fits the context.
- ELIMINATE AI-tell phrases entirely: "delve", "In today's fast-paced world", "It's important to note", "landscape" (as a metaphor), "unlock", "game-changer", "elevate", "In conclusion", "Moreover", "Furthermore" as sentence openers, and formulaic triads ("X, Y, and Z" lists used as rhetorical flourish).
- Avoid em-dash overuse — at most a couple in the whole piece.
- Never sound like marketing copy reading its own press release.

You MUST preserve, character-for-character where noted:
- Every H2 (##) and H3 (###) heading: keep the exact heading text and order.
- Every Markdown link [anchor](url): keep every citation link with its exact URL. You may lightly adjust surrounding prose but the links themselves must all survive.
- The primary keyword and secondary keywords: they must still appear naturally in the text.
- Bullet lists may be reworded but not removed.
- Overall word count must stay within ±10% of the original.
- Do NOT add new sections, new claims, or new facts. Do NOT remove information.

Respond ONLY with a valid JSON object. No prose outside JSON.`;

export async function humanizeArticle(
  article: GeneratedArticle,
  opts: HumanizeOptions
): Promise<GeneratedArticle> {
  try {
    const ai = opts.aiClient ?? getAiClient();

    const intensityCtx =
      opts.level === "strong"
        ? `Intensity: STRONG. Do a full rewrite of the voice — restructure sentences and paragraphs freely (within the preservation rules), inject personality and directness, as if a sharp human editor rewrote the whole draft in their own words.`
        : `Intensity: LIGHT. Polish rhythm and word choice — fix robotic cadence, swap AI-tell phrases, add contractions, vary sentence length. Keep the original sentences where they already read naturally.`;

    const voiceCtx = opts.writingSample?.trim()
      ? `Mimic the cadence, diction, and tone of this writing sample from the author (do NOT copy its content, only its voice):
---WRITING SAMPLE START---
${opts.writingSample.trim().slice(0, 4000)}
---WRITING SAMPLE END---`
      : "";

    const prompt = `Rewrite the following article draft to read human.

${intensityCtx}
${voiceCtx}

Primary keyword (must remain present): "${article.primaryKeyword}"
Secondary keywords (must remain present): ${article.secondaryKeywords.join(", ")}
Original word count: ${article.wordCount} (stay within ±10%)

Meta description to also rewrite (150-160 chars, keep the primary keyword):
${article.metaDescription}

Article body (Markdown):
${article.bodyMarkdown}

Return a JSON object with these EXACT fields:
- bodyMarkdown: string — the rewritten article body in Markdown, with all headings and citation links preserved
- metaDescription: string — the rewritten meta description, 150-160 chars, includes the primary keyword
- wordCount: number — word count of the rewritten body`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });

    const raw = response.text ?? "";
    const parsed = cleanAndParse<HumanizedOutput>(raw);

    if (!parsed.bodyMarkdown || typeof parsed.bodyMarkdown !== "string") {
      return article;
    }

    // Safety checks: reject the rewrite if it dropped structure we must preserve.
    const originalHeadings = extractHeadings(article.bodyMarkdown);
    const rewrittenHeadings = extractHeadings(parsed.bodyMarkdown);
    if (rewrittenHeadings.length < originalHeadings.length) {
      return article;
    }

    const originalUrls = extractLinkUrls(article.bodyMarkdown);
    const rewrittenUrls = new Set(extractLinkUrls(parsed.bodyMarkdown));
    if (!originalUrls.every((url) => rewrittenUrls.has(url))) {
      return article;
    }

    const rewrittenWordCount = countWords(parsed.bodyMarkdown);
    if (
      article.wordCount > 0 &&
      (rewrittenWordCount < article.wordCount * 0.8 || rewrittenWordCount > article.wordCount * 1.25)
    ) {
      return article;
    }

    const usageMetadata = (
      response as unknown as {
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
      }
    ).usageMetadata;

    const aggregatedUsage =
      article.generationUsage || usageMetadata
        ? {
            promptTokens:
              (article.generationUsage?.promptTokens ?? 0) + (usageMetadata?.promptTokenCount ?? 0),
            outputTokens:
              (article.generationUsage?.outputTokens ?? 0) + (usageMetadata?.candidatesTokenCount ?? 0),
            totalTokens:
              (article.generationUsage?.totalTokens ?? 0) + (usageMetadata?.totalTokenCount ?? 0),
          }
        : undefined;

    return {
      ...article,
      bodyMarkdown: parsed.bodyMarkdown,
      metaDescription:
        typeof parsed.metaDescription === "string" && parsed.metaDescription.length > 0
          ? parsed.metaDescription
          : article.metaDescription,
      wordCount: rewrittenWordCount,
      generationUsage: aggregatedUsage,
    };
  } catch {
    // Humanization must never break generation — fall back to the original article.
    return article;
  }
}

function extractHeadings(markdown: string): string[] {
  return markdown.split("\n").filter((line) => /^#{2,3}\s/.test(line.trim()));
}

function extractLinkUrls(markdown: string): string[] {
  const urls: string[] = [];
  const regex = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
