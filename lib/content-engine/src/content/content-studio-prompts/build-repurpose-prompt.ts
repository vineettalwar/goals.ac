import type { ContentFormatType } from "@workspace/db";
import type { BrandContext } from "./types";
import { FORMAT_CONFIGS } from "./format-configs";
import { resolveVoicePromptContext } from "./build-prompt";

export async function buildRepurposePrompt(
  targetFormat: ContentFormatType,
  brand: BrandContext,
  existingContent: string,
  existingKeyword: string,
  competitorPromptBlock?: string,
): Promise<string> {
  const config = FORMAT_CONFIGS[targetFormat];
  const brandVoiceContext = await resolveVoicePromptContext(
    brand,
    targetFormat,
    existingKeyword,
  );
  // Generic fallback removed — callers must gate with isProjectVoiceReady / voice_required.
  const defaultVoice = brand.voiceTone?.trim() ?? "";
  const competitorContext = competitorPromptBlock?.trim() ?? "";
  const voiceLine = brandVoiceContext || (defaultVoice ? `\nBRAND VOICE: ${defaultVoice}` : "");
  return `Repurpose the following existing content into a ${config.label} for ${brand.companyName} (${brand.websiteUrl}).

EXISTING CONTENT:
${existingContent.slice(0, 4000)}

TARGET FORMAT: ${config.label} (${config.wordRange} words)
TARGET KEYWORD: "${existingKeyword}"
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}${voiceLine}${competitorContext}

Rewrite the content following this structure:
${config.structure}

Return ONLY this exact JSON with no additional text:
{
  "title": "<compelling, SEO-optimised title that includes the target keyword: 55-70 characters>",
  "target_keyword": "${existingKeyword}",
  "body_markdown": "<full repurposed content in valid markdown following the structure above>"
}

Requirements:
- Preserve the core insights and key messages from the original
- Adapt the format, tone, and structure to suit ${config.label}
- Write entirely in the brand voice described above
- Reference ${brand.companyName} 2-3 times naturally
- Content must feel fresh and purpose-built for this format, not just copy-pasted`;
}
