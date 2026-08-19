import { fetchGoalsAcSiteGraph, type GoalsAcPluginCredentials } from "@workspace/connectors/goals-ac-plugin";
import type { CanonicalContent } from "../content/canonical-content";
import { contentTagsFromCanonical } from "./adapter-helpers";

export type WpTaxonomyTerm = {
  id: number;
  name: string;
  slug: string;
};

type WpSiteGraphTaxonomies = {
  categories?: WpTaxonomyTerm[];
  tags?: WpTaxonomyTerm[];
};

/** ponytail: in-memory per-publish cache; upgrade to shared cache if publish volume spikes */
const siteGraphTaxonomyCache = new Map<string, { at: number; graph: WpSiteGraphTaxonomies }>();
const SITE_GRAPH_TTL_MS = 15 * 60 * 1000;

function normalizeTermKey(value: string): string {
  return value.trim().toLowerCase();
}

function graphCacheKey(creds: GoalsAcPluginCredentials): string {
  return `${creds.platform}:${creds.siteUrl}`;
}

export function resolveWordPressTermIds(
  namesOrIds: Array<string | number>,
  terms: WpTaxonomyTerm[],
): number[] {
  const byName = new Map<string, number>();
  const bySlug = new Map<string, number>();
  const validIds = new Set(terms.map((term) => term.id));

  for (const term of terms) {
    byName.set(normalizeTermKey(term.name), term.id);
    bySlug.set(term.slug.toLowerCase(), term.id);
  }

  const resolved: number[] = [];
  for (const raw of namesOrIds) {
    if (typeof raw === "number" && raw > 0 && validIds.has(raw)) {
      resolved.push(raw);
      continue;
    }

    const text = String(raw).trim();
    if (!text) continue;

    const asNum = Number(text);
    if (Number.isInteger(asNum) && asNum > 0 && validIds.has(asNum)) {
      resolved.push(asNum);
      continue;
    }

    const slugGuess = text.toLowerCase().replace(/\s+/g, "-");
    const id = byName.get(normalizeTermKey(text)) ?? bySlug.get(slugGuess);
    if (id) resolved.push(id);
  }

  return [...new Set(resolved)];
}

/** Parse `section:News` (pipe-separated angle convention for magazine workflows). */
export function parseSectionFromAngle(angleHint?: string | null): string | null {
  if (!angleHint?.trim()) return null;
  for (const part of angleHint.split("|")) {
    const trimmed = part.trim();
    if (!trimmed.toLowerCase().startsWith("section:")) continue;
    const name = trimmed.slice("section:".length).trim();
    if (name) return name;
  }
  return null;
}

export function categoryNamesFromContent(content: CanonicalContent): string[] {
  const names: string[] = [];
  const fromMeta = content.pieceMetadata?.cmsCategories;
  if (Array.isArray(fromMeta)) {
    for (const name of fromMeta) {
      if (typeof name === "string" && name.trim()) names.push(name.trim());
    }
  }

  const fromAngle =
    parseSectionFromAngle(content.pieceMetadata?.contentAngle) ??
    parseSectionFromAngle(content.pieceMetadata?.focusKeyword);
  if (fromAngle) names.push(fromAngle);

  return [...new Set(names)];
}

export function tagNamesFromContent(content: CanonicalContent): string[] {
  const fromMeta = content.pieceMetadata?.cmsTags;
  if (Array.isArray(fromMeta) && fromMeta.length > 0) {
    return [...new Set(fromMeta.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim()))];
  }
  return contentTagsFromCanonical(content);
}

async function loadSiteGraphTaxonomies(
  creds: GoalsAcPluginCredentials,
): Promise<WpSiteGraphTaxonomies> {
  const key = graphCacheKey(creds);
  const cached = siteGraphTaxonomyCache.get(key);
  if (cached && Date.now() - cached.at < SITE_GRAPH_TTL_MS) {
    return cached.graph;
  }

  const graph = await fetchGoalsAcSiteGraph<{
    categories?: Array<{ id: number; name: string; slug: string }>;
    tags?: Array<{ id: number; name: string; slug: string }>;
  }>(creds);

  const normalized: WpSiteGraphTaxonomies = {
    categories: (graph.categories ?? []).map((term) => ({
      id: term.id,
      name: term.name,
      slug: term.slug,
    })),
    tags: (graph.tags ?? []).map((term) => ({
      id: term.id,
      name: term.name,
      slug: term.slug,
    })),
  };

  siteGraphTaxonomyCache.set(key, { at: Date.now(), graph: normalized });
  return normalized;
}

export async function resolveWordPressTaxonomyIds(
  creds: GoalsAcPluginCredentials,
  content: CanonicalContent,
): Promise<{ categoryIds: number[]; tagIds: number[] }> {
  const graph = await loadSiteGraphTaxonomies(creds);
  return {
    categoryIds: resolveWordPressTermIds(categoryNamesFromContent(content), graph.categories ?? []),
    tagIds: resolveWordPressTermIds(tagNamesFromContent(content), graph.tags ?? []),
  };
}
