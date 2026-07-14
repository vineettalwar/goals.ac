import type { AiTier } from "@workspace/billing";

/** Maps usage event types to AI provider tiers for credit pricing. */
export const EVENT_TYPE_TIERS: Record<string, AiTier> = {
  article_generation: "execution",
  content_generation: "execution",
  content_regenerate: "execution",
  content_repurpose: "execution",
  content_enhance: "rapid",
  seo_article_generation: "execution",
  content_strategy_generation: "strategy",
  roadmap_generation: "planning",
  topic_ideas: "rapid",
  persona_generation: "planning",
  topical_map: "planning",
  reddit_discovery: "planning",
  competitor_analysis: "planning",
  keyword_analysis: "planning",
  chat: "rapid",
  platform_voice_analysis: "planning",
  brand_voice_analysis: "planning",
  brand_voice_skill: "planning",
};

export function tierForEventType(eventType: string, fallback: AiTier = "execution"): AiTier {
  return EVENT_TYPE_TIERS[eventType] ?? fallback;
}
