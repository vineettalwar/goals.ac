import type { ContentPieceMetadata } from "../content-piece-seo";
import type { FunnelStage, ProofAsset } from "../personalization";
import type { UnifiedBrandContext } from "../../brand/brand-voice";

export interface ContentPieceResult {
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
  generationUsage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export type ContentGenerationContext = {
  existingPieceTitles?: string[];
  intendedPublishPlatform?: string;
  intendedOutputMode?: string;
  intendedEditorMode?: "classic" | "gutenberg" | "elementor" | "divi";
  competitorPromptBlock?: string;
  competitorFocusUrl?: string;
  /** Per-piece competitor URLs (max 5); first is primary when focus omitted */
  competitorUrls?: string[];
  /** From the compiled brief, when available. Shapes reader-awareness guidance in the SEO longform prompt. */
  funnelStage?: FunnelStage;
  /** Verified proof points from brand memory, pre-selected for this keyword. */
  proofAssets?: ProofAsset[];
};

export type BrandContext = UnifiedBrandContext;
