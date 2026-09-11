import type { AiProviderClient, AiProviderOptions } from "@workspace/ai-providers";
import type { ContentFormatType } from "@workspace/db";
import type { PlatformVoices } from "@workspace/db/schema";
import type { GeneratedArticle } from "../../articles/article-generator";
import type { HumanizationLevel, UnifiedBrandContext } from "../../brand/brand-voice";
import {
  buildPlatformVoicePromptContext,
  PLATFORM_CHAR_LIMITS,
  PLATFORM_LABELS,
  platformForFormat,
  type SocialPlatformId,
} from "../../platform-voice";
import type { ContentPieceMetadata, HumanizationAudit } from "../content-piece-seo";

export interface HumanizableContentPiece {
  title: string;
  target_keyword: string;
  body_markdown: string;
  meta_description?: string;
  secondary_keywords?: string[];
  faq_section?: { question: string; answer: string }[];
  citations?: { text: string; url: string; source: string }[];
  internal_link_suggestions?: {
    anchorText: string;
    suggestedSlug: string;
    rationale?: string;
  }[];
  json_ld_schema?: object;
  pieceMetadata?: ContentPieceMetadata & {
    secondaryKeywords?: string[];
  };
}

export type { HumanizationLevel };

export type { HumanizationAudit } from "../content-piece-seo";

export interface HumanizeOptions {
  level: HumanizationLevel;
  writingSample?: string;
  brandVoice?: UnifiedBrandContext;
  aiClient?: AiProviderClient;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
  /** When set, inject platform-voice presets + char limits for social formats. */
  formatType?: ContentFormatType;
  platformVoices?: PlatformVoices | null;
}

/** Default tone hints when no trained platform voice exists. */
export const PLATFORM_HUMANIZE_PRESETS: Record<SocialPlatformId, string> = {
  linkedin:
    "LinkedIn: professional but direct; short paragraphs; one clear insight; soft CTA; no hashtag spam.",
  twitter:
    "X/Twitter: punchy; one idea per tweet; thread-friendly line breaks; stay under the char limit.",
  instagram:
    "Instagram: caption-first; hook in line 1; line breaks for scanability; light emoji only if natural; CTA in last line.",
  facebook:
    "Facebook: conversational; community tone; one ask or share prompt; avoid hard-sell openers.",
  bluesky:
    "Bluesky: concise AT Proto post; plain language; under 300 graphemes; no thread padding.",
  mastodon:
    "Mastodon: instance-friendly toot; clear CW-safe language; under 500 chars; no engagement bait.",
};

export function buildSocialPlatformPromptBlock(
  formatType: ContentFormatType | undefined,
  voices: PlatformVoices | null | undefined,
): string {
  if (!formatType) return "";
  const platform = platformForFormat(formatType);
  if (!platform) return "";

  const label = PLATFORM_LABELS[platform];
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const trained = buildPlatformVoicePromptContext(voices, platform).trim();
  const preset = PLATFORM_HUMANIZE_PRESETS[platform];

  return [
    `Social platform: ${label} (hard max ~${limit} characters for the full post body).`,
    preset,
    trained || null,
    `Stay within ${limit} characters after rewrite. Prefer cutting fluff over truncating mid-sentence.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface HumanizedOutput {
  bodyMarkdown: string;
  metaDescription: string;
  wordCount: number;
}

export type HumanizeArticleResult = {
  article: GeneratedArticle;
  audit: HumanizationAudit;
  changed: boolean;
};
