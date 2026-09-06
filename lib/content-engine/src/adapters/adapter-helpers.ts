import type { CanonicalContent } from "../content/canonical-content";
import {
  mapSeoToAioseoRestField,
  mapSeoToPluginMeta,
  mapSeoToWordPressRestMeta,
  seoFromPieceMetadata,
  type CanonicalSeoFields,
  type DetectedSeoPlugin,
} from "../support/publishing/seo-field-mapper";

export function contentTagsFromCanonical(content: CanonicalContent): string[] {
  const tags: string[] = [];
  if (content.targetKeyword) tags.push(content.targetKeyword);
  if (content.formatType) tags.push(content.formatType.replace(/_/g, " "));
  return tags;
}

export function resolveSeoFromCanonical(
  content: CanonicalContent,
  ogImageOverride?: string,
): CanonicalSeoFields {
  const seo = seoFromPieceMetadata(
    content.meta.title,
    content.targetKeyword,
    content.pieceMetadata,
  );
  if (ogImageOverride) {
    return { ...seo, ogImageUrl: ogImageOverride };
  }
  return seo;
}

export function seoTitle(content: CanonicalContent, seo: CanonicalSeoFields): string {
  return seo.seoTitle ?? content.meta.title;
}

export {
  mapSeoToAioseoRestField,
  mapSeoToPluginMeta,
  mapSeoToWordPressRestMeta,
  type DetectedSeoPlugin,
};
