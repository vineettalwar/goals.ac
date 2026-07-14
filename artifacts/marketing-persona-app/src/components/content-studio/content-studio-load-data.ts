import type { AiProviderId } from "@/lib/ai/providers";
import type { CmsConnectionSnapshot } from "@/lib/projects/publishing-destinations";
import type { ContentPieceRow } from "./content-studio-client";

export type LegacyItem = {
  id: number;
  title: string;
  keyword: string;
  wordCount: number;
  status: string;
  createdAt: string;
  source: "seo_article" | "content_strategy" | "geo_audit" | "roadmap";
  linkTo: string;
  subtitle?: string;
};

export type StudioLoadResult = {
  projectName: string;
  aiReady: boolean | null;
  activeProvider: AiProviderId;
  pieces: Array<ContentPieceRow & { source: "studio" }>;
  legacyItems: LegacyItem[];
  cmsConnections: CmsConnectionSnapshot;
  primaryBlogDestination: string | null;
};

export async function loadContentStudioData(projectId: string): Promise<StudioLoadResult> {
  const [projRes, piecesRes, legacyRes, aiStatusRes, cmsRes, publishingRes] = await Promise.all([
    fetch(`/api/website-projects/${projectId}`),
    fetch(`/api/website-projects/${projectId}/content-pieces`),
    fetch(`/api/website-projects/${projectId}/content`),
    fetch("/api/ai-providers/status"),
    fetch(`/api/website-projects/${projectId}/cms-integrations`),
    fetch(`/api/website-projects/${projectId}/publishing-settings`),
  ]);

  let projectName = "";
  if (projRes.ok) {
    const proj = await projRes.json();
    projectName = proj.name ?? "";
  }

  let aiReady: boolean | null = null;
  let activeProvider: AiProviderId = "gemini";
  if (aiStatusRes.ok) {
    const status = await aiStatusRes.json();
    activeProvider = status.activeProvider ?? "gemini";
    aiReady = Boolean(status.ready);
  }

  let pieces: StudioLoadResult["pieces"] = [];
  if (piecesRes.ok) {
    const data = await piecesRes.json();
    pieces = (data.pieces ?? []).map((p: ContentPieceRow) => ({ ...p, source: "studio" as const }));
  }

  let legacyItems: LegacyItem[] = [];
  if (legacyRes.ok) {
    const legacy = await legacyRes.json();
    const strategyMap = new Map(
      (legacy.contentStrategies ?? []).map((s: { id: number; industry: string; location: string }) => [s.id, s]),
    );
    legacyItems = [
      ...(legacy.seoArticles ?? []).map(
        (a: { id: number; title: string; primaryKeyword: string; wordCount: number; status: string; createdAt: string }) => ({
          id: a.id,
          title: a.title,
          keyword: a.primaryKeyword,
          wordCount: a.wordCount,
          status: a.status,
          createdAt: a.createdAt,
          source: "seo_article" as const,
          linkTo: `/seo-article/${a.id}`,
        }),
      ),
      ...(legacy.contentItems ?? []).map(
        (ci: { id: number; strategyId: number; day: number; title: string; primaryKeyword: string; status: string; createdAt: string }) => {
          const strategy = strategyMap.get(ci.strategyId) as { industry: string; location: string } | undefined;
          return {
            id: ci.id,
            title: ci.title,
            keyword: ci.primaryKeyword,
            wordCount: 0,
            status: ci.status,
            createdAt: ci.createdAt,
            source: "content_strategy" as const,
            linkTo: `/admin/content-strategies`,
            subtitle: strategy ? `Day ${ci.day} · ${strategy.industry} · ${strategy.location}` : `Day ${ci.day}`,
          };
        },
      ),
      ...(legacy.geoAudits ?? []).map(
        (g: { id: number; url: string; status: string; createdAt: string }) => ({
          id: g.id,
          title: `GEO Audit — ${g.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}`,
          keyword: g.url.replace(/^https?:\/\//, "").split("/")[0],
          wordCount: 0,
          status: g.status ?? "ready",
          createdAt: g.createdAt,
          source: "geo_audit" as const,
          linkTo: `/audit/${g.id}`,
        }),
      ),
      ...(legacy.roadmaps ?? []).map(
        (r: { id: number; slug: string; industry: string; location: string; createdAt: string }) => ({
          id: r.id,
          title: `${r.industry} Growth Roadmap — ${r.location}`,
          keyword: r.industry,
          wordCount: 0,
          status: "ready",
          createdAt: r.createdAt,
          source: "roadmap" as const,
          linkTo: `/roadmap/${r.slug}`,
        }),
      ),
    ];
  }

  let cmsConnections: CmsConnectionSnapshot = {};
  if (cmsRes.ok) {
    cmsConnections = await cmsRes.json();
  }

  let primaryBlogDestination: string | null = null;
  if (publishingRes.ok) {
    const settings = (await publishingRes.json()) as { primaryBlogDestination?: string | null };
    primaryBlogDestination = settings.primaryBlogDestination ?? null;
  }

  return {
    projectName,
    aiReady,
    activeProvider,
    pieces,
    legacyItems,
    cmsConnections,
    primaryBlogDestination,
  };
}
