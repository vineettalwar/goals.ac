import type { PublishingSettings } from "@workspace/db";
import { outputModeLabel } from "./platform-output-modes";

export type { PublishingSettings };

export function parsePublishingSettings(raw: unknown): PublishingSettings {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const primary = o.primaryBlogDestination;
  return {
    primaryBlogDestination:
      typeof primary === "string" && primary.trim() ? primary.trim() : null,
  };
}

/** Prompt hints keyed by destination — generation-only, not wire format. */
export function buildDestinationPromptHint(
  platform?: string | null,
  outputMode?: string | null,
  /** @deprecated Use outputMode */
  editorMode?: string | null,
): string {
  if (!platform) return "";

  const mode = outputMode ?? editorMode ?? null;
  const modeLabel = mode ? outputModeLabel(platform, mode) : null;

  const baseHints: Record<string, string> = {
    wordpress:
      "Structure for WordPress: clear H2/H3 hierarchy, short paragraphs, image placeholders as ![alt](description) where helpful.",
    notion:
      "Structure for Notion: concise sections, avoid deep nesting; use plain headings and bullet lists.",
    webflow:
      "Structure for Webflow CMS: semantic HTML-friendly markdown, clean headings, minimal complex tables.",
    ghost: "Structure for Ghost: strong opening excerpt, clear H2 sections, pull-quote-friendly paragraphs.",
    webhook:
      "Include rich metadata: explicit FAQ pairs, citations with URLs, and a clear meta description suitable for headless CMS.",
    contentful:
      "Structure for headless CMS: consistent field-friendly sections; include FAQ and meta description.",
    sanity:
      "Structure for headless CMS: consistent field-friendly sections; include FAQ and meta description.",
    strapi:
      "Structure for headless CMS: consistent field-friendly sections; include FAQ and meta description.",
    linkedin: "Already a LinkedIn-native format.",
    twitter: "Thread-friendly: short punchy segments that can split at ~280 characters.",
    shopify: "Structure for Shopify blog: product-aware tone, scannable sections, commerce-friendly CTAs.",
    drupal: "Structure for Drupal: semantic sections with clear H2/H3 hierarchy suitable for body or layout fields.",
    joomla: "Structure for Joomla: clean markdown with scannable headings; plugin converts to site format.",
    typo3: "Structure for TYPO3: distinct H2 sections that map cleanly to content elements when needed.",
  };

  let hint = baseHints[platform] ?? `Optimize structure for publishing to ${platform}.`;

  if (platform === "wordpress") {
    if (mode === "gutenberg") {
      hint += " Use distinct H2/H3 sections suitable for Gutenberg blocks; one idea per section.";
    } else if (mode === "elementor") {
      hint += " Favor visual sections with strong headings; keep paragraphs compact.";
    } else if (mode === "divi") {
      hint += " Use clear section breaks with H2 headings; avoid overly nested lists.";
    }
  } else if (platform === "ghost" && mode === "lexical") {
    hint += " Favor card-friendly sections: short paragraphs, pull quotes, image cards, and gallery placeholders.";
  } else if (platform === "drupal" && mode === "layout_builder") {
    hint += " One major idea per H2 section; sections should map to Layout Builder regions.";
  } else if (platform === "typo3" && mode === "content_elements") {
    hint += " Each H2 should start a distinct content element; keep sections self-contained.";
  } else if (platform === "shopify") {
    if (mode === "article_metafields") {
      hint += " Include structured FAQ, key takeaways, and section summaries suitable for metafield JSON.";
    } else if (mode === "page_sections") {
      hint += " Structure as landing-page sections with hero, benefits, FAQ, and CTA blocks.";
    }
  } else if (platform === "joomla" && mode === "html") {
    hint += " Write final HTML-ready prose; avoid markdown-specific syntax beyond headings and lists.";
  } else if (platform === "webhook") {
    if (mode === "markdown") {
      hint += " Optimize markdown structure; metadata fields should remain explicit in front matter style sections.";
    } else if (mode === "html") {
      hint += " Optimize for clean HTML body output with semantic headings.";
    } else if (mode === "full") {
      hint += " Include complete FAQ, citations, schema hints, and canonical section metadata in the payload.";
    }
  }

  const destinationLabel = modeLabel ? `${platform} (${modeLabel})` : platform;
  return `\nINTENDED PUBLISH DESTINATION: ${destinationLabel}\n${hint}`;
}
