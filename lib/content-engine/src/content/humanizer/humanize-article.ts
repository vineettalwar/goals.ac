import { getAiProviderClient, type AiProviderClient } from "@workspace/ai-providers";
import { isTwitterThreadOverLimit } from "@workspace/connectors/twitter-thread";
import { cleanAndParseLenient } from "../../core/utils";
import type { GeneratedArticle } from "../../articles/article-generator";
import { resolveAiClient } from "../../support/ai/resolve-ai-client";
import {
  buildBrandVoicePromptContext,
  resolveWritingSample,
} from "../../brand/brand-voice";
import { loadBrandVoiceGenerationContext } from "../../support/brand/brand-voice-generation";
import {
  AI_WRITING_REWRITE_RULES_PROMPT,
  countAiSlopSignals,
  diagnoseAiTells,
  formatAiTellDiagnosisSummary,
  sanitizeAiProse,
} from "../ai-writing-rules";
import {
  PLATFORM_CHAR_LIMITS,
  platformForFormat,
} from "../../platform-voice";
import {
  buildAudit,
  passesHumanizeQualityGate,
  passesHumanizeStructureGuards,
} from "./guards";
import { countWords } from "./text-utils";
import {
  buildSocialPlatformPromptBlock,
  type HumanizeArticleResult,
  type HumanizedOutput,
  type HumanizeOptions,
} from "./types";

const SYSTEM_PROMPT = `You are a senior human editor. Rewrite AI-generated drafts so they read like an experienced human wrote them, while preserving SEO structure exactly.

Work in two ordered passes inside your rewrite:
Pass 1 — SUBTRACT:
- Delete generic intros and conclusions. Start on the actual point; end on the last real thing you have to say.
- Cut buzzwords, abstract noun fog, corporate verbs, and filler transitions.
- Break uniform section shapes where safe (one section can run long, another short).

Pass 2 — ADD specificity and voice:
- Replace generic phrasing with concrete, specific language already supported by the draft.
- Commit to claims instead of hedging where the draft allows.
- Vary sentence length deliberately: mix short punchy sentences with longer ones.
- Use contractions naturally (it's, don't, you're, we've).
- Use first/second person where it fits the context.
- Litmus test: if a sentence could appear verbatim in a thousand articles, make it specific or cut it.

${AI_WRITING_REWRITE_RULES_PROMPT}
- Never sound like marketing copy reading its own press release.
- Never fabricate statistics, quotes, or anecdotes.

You MUST preserve, character-for-character where noted:
- Every H2 (##) and H3 (###) heading: keep the exact heading text and order.
- Every Markdown link [anchor](url): keep every citation link with its exact URL. You may lightly adjust surrounding prose but the links themselves must all survive.
- The primary keyword and secondary keywords: they must still appear naturally in the text.
- Bullet lists may be reworded but not removed.
- Overall word count must stay within ±10% of the original.
- Do NOT add new sections, new claims, or new facts. Do NOT remove information.

Respond ONLY with a valid JSON object. No prose outside JSON.`;

async function resolveHumanizerClient(opts: HumanizeOptions): Promise<AiProviderClient> {
  if (opts.aiClient) return opts.aiClient;
  if (opts.userApiKey !== undefined || opts.aiProviderOptions) {
    return resolveAiClient(opts.userApiKey, opts.aiProviderOptions);
  }
  return getAiProviderClient();
}

export async function humanizeArticle(
  article: GeneratedArticle,
  opts: HumanizeOptions,
): Promise<HumanizeArticleResult> {
  const slopScoreBefore = countAiSlopSignals(article.bodyMarkdown);
  const diagnosisSummary = formatAiTellDiagnosisSummary(diagnoseAiTells(article.bodyMarkdown));

  try {
    const ai = await resolveHumanizerClient(opts);

    const intensityCtx =
      opts.level === "strong"
        ? `Intensity: STRONG. Do a full rewrite of the voice — restructure sentences and paragraphs freely (within the preservation rules), inject personality and directness, as if a sharp human editor rewrote the whole draft in their own words.`
        : `Intensity: LIGHT. Polish rhythm and word choice — fix robotic cadence, swap AI-tell phrases, add contractions, vary sentence length. Keep the original sentences where they already read naturally.`;

    const voiceCtx = await (async () => {
      const sample =
        opts.writingSample?.trim() || (opts.brandVoice ? resolveWritingSample(opts.brandVoice) : undefined);
      let brandVoiceCtx = "";
      if (opts.brandVoice) {
        if (opts.brandVoice.projectId) {
          const ctx = await loadBrandVoiceGenerationContext(
            opts.brandVoice.projectId,
            `${article.primaryKeyword} humanize`,
          );
          brandVoiceCtx = ctx?.promptContext ?? buildBrandVoicePromptContext(opts.brandVoice);
        } else {
          brandVoiceCtx = buildBrandVoicePromptContext(opts.brandVoice);
        }
      }
      const sampleCtx = sample
        ? `Mimic the cadence, diction, and tone of this writing sample from the author (do NOT copy its content, only its voice):
---WRITING SAMPLE START---
${sample.slice(0, 4000)}
---WRITING SAMPLE END---`
        : "";
      return [brandVoiceCtx.trim(), sampleCtx].filter(Boolean).join("\n\n");
    })();

    const tellCtx = diagnosisSummary
      ? `\nFix these detected AI tells in the draft:\n${diagnosisSummary}\n`
      : "";

    const socialCtx = buildSocialPlatformPromptBlock(
      opts.formatType,
      opts.platformVoices ?? opts.brandVoice?.platformVoices,
    );

    const prompt = `Rewrite the following article draft to read human.

${intensityCtx}
${tellCtx}
${voiceCtx}
${socialCtx}

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

    const response = await ai.generate({
      prompt,
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 16384,
      thinkingBudget: 1024,
    });

    const raw = response.text ?? "";
    const parsed = cleanAndParseLenient<HumanizedOutput>(raw);

    if (!parsed.bodyMarkdown || typeof parsed.bodyMarkdown !== "string") {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, "parse failed"),
        changed: false,
      };
    }

    const socialPlatform = opts.formatType ? platformForFormat(opts.formatType) : null;
    const citationUrls = (article.citations ?? []).map((c) => c.url).filter(Boolean);
    const structure = passesHumanizeStructureGuards(
      article.bodyMarkdown,
      parsed.bodyMarkdown,
      citationUrls,
    );
    if (!structure.ok) {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, structure.reason),
        changed: false,
      };
    }

    const rewrittenWordCount = countWords(parsed.bodyMarkdown);
    // Long-form: stay near original length. Social: char limit is the contract.
    if (
      !socialPlatform &&
      article.wordCount > 0 &&
      (rewrittenWordCount < article.wordCount * 0.8 || rewrittenWordCount > article.wordCount * 1.25)
    ) {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, "length guard"),
        changed: false,
      };
    }

    const sanitizedBody = sanitizeAiProse(parsed.bodyMarkdown);
    if (socialPlatform) {
      const limit = PLATFORM_CHAR_LIMITS[socialPlatform];
      const overLimit =
        socialPlatform === "twitter"
          ? isTwitterThreadOverLimit(sanitizedBody, limit)
          : sanitizedBody.length > limit;
      if (overLimit) {
        return {
          article,
          audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, "platform length"),
          changed: false,
        };
      }
    }

    const structureAfterSanitize = passesHumanizeStructureGuards(
      article.bodyMarkdown,
      sanitizedBody,
      citationUrls,
    );
    if (!structureAfterSanitize.ok) {
      return {
        article,
        audit: buildAudit(
          opts.level,
          slopScoreBefore,
          slopScoreBefore,
          true,
          structureAfterSanitize.reason,
        ),
        changed: false,
      };
    }

    const slopScoreAfter = countAiSlopSignals(sanitizedBody);
    const quality = passesHumanizeQualityGate(
      article.bodyMarkdown,
      sanitizedBody,
      slopScoreBefore,
      slopScoreAfter,
      { skipHumanVoiceFloor: Boolean(socialPlatform) },
    );
    if (!quality.ok) {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreAfter, true, quality.reason),
        changed: false,
      };
    }

    const rewritten: GeneratedArticle = {
      ...article,
      bodyMarkdown: sanitizedBody,
      metaDescription:
        typeof parsed.metaDescription === "string" && parsed.metaDescription.length > 0
          ? sanitizeAiProse(parsed.metaDescription)
          : article.metaDescription,
      wordCount: rewrittenWordCount,
    };

    return {
      article: rewritten,
      audit: buildAudit(opts.level, slopScoreBefore, slopScoreAfter, false),
      changed: sanitizedBody !== article.bodyMarkdown,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "humanize error";
    if (/not configured|no gemini api key|api key/i.test(message)) {
      throw err;
    }
    return {
      article,
      audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, "humanize error"),
      changed: false,
    };
  }
}
