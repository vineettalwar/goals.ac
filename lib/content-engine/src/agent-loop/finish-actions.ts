import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { planInternalLinks, type LinkSourcePost } from "../strategy/internal-link-planner";
import { applyInternalLinksToMarkdown, suggestOutboundInternalLinks } from "../content/outbound-internal-links";
import type { AgentTool, AgentToolResult, EvidenceRef } from "./types";
import type { ContentPieceMetadata } from "../content/content-piece-seo";

export type CtrTitleSuggestion = {
  title: string;
  seoTitle: string;
  metaDescription: string;
};

export function buildCtrTitleSuggestions(keyword: string, currentTitle?: string | null): CtrTitleSuggestion[] {
  const kw = keyword.trim() || "this page";
  const current = currentTitle?.trim();
  const titles = [
    current && !current.toLowerCase().includes(kw.toLowerCase()) ? `${kw}: ${current}` : null,
    `${kw} — what to do first`,
    `How ${kw} actually works (without the fluff)`,
  ].filter((row): row is string => Boolean(row));
  const unique = [...new Set(titles)].slice(0, 3);
  return unique.map((title) => ({
    title,
    seoTitle: title.slice(0, 60),
    metaDescription: `${title}. Practical take on ${kw}.`.slice(0, 155),
  }));
}

function ok(summary: string, evidenceRefs: EvidenceRef[], data?: unknown): AgentToolResult {
  const verified = evidenceRefs.some((ref) => ref.verified);
  return { ok: true, summary, evidenceRefs, data, hasToolEvidence: verified };
}

function fail(error: string): AgentToolResult {
  return { ok: false, summary: error, error, evidenceRefs: [], hasToolEvidence: false };
}

async function findPiece(projectId: number, keyword?: string, url?: string) {
  const kw = keyword?.trim();
  const href = url?.trim();
  if (!kw && !href) return null;
  const [row] = await db
    .select()
    .from(contentPiecesTable)
    .where(
      and(
        eq(contentPiecesTable.websiteProjectId, projectId),
        href && kw
          ? or(eq(contentPiecesTable.publishedUrl, href), eq(contentPiecesTable.targetKeyword, kw))
          : href
            ? eq(contentPiecesTable.publishedUrl, href)
            : eq(contentPiecesTable.targetKeyword, kw!),
      ),
    )
    .orderBy(desc(contentPiecesTable.updatedAt))
    .limit(1);
  return row ?? null;
}

export function createFinishActionTools(): AgentTool[] {
  const suggestCtrTitle: AgentTool = {
    name: "suggest_ctr_title",
    description: "Write CTR title + meta suggestions and apply them to the matching piece when asked.",
    risk: "write",
    creditCost: 2,
    async execute(args) {
      const projectId = Number(args.projectId);
      const keyword = typeof args.keyword === "string" ? args.keyword : "";
      const url = typeof args.url === "string" ? args.url : undefined;
      const apply = args.apply !== false;
      const piece = Number.isFinite(projectId) ? await findPiece(projectId, keyword, url) : null;
      const suggestions = buildCtrTitleSuggestions(keyword, piece?.title ?? null);
      if (suggestions.length === 0) return fail("No title suggestions");
      const pick = suggestions[0]!;
      if (apply && piece) {
        const meta: ContentPieceMetadata = {
          ...(piece.pieceMetadata ?? {}),
          seoTitle: pick.seoTitle,
          metaDescription: pick.metaDescription,
          ctrTitleSuggestions: suggestions,
        };
        await db
          .update(contentPiecesTable)
          .set({
            title: pick.title,
            pieceMetadata: meta,
            updatedAt: new Date(),
          })
          .where(eq(contentPiecesTable.id, piece.id));
      }
      const refs: EvidenceRef[] = [
        { source: `ctr_title ${keyword || piece?.title || "piece"}`, url: piece?.publishedUrl ?? url, verified: Boolean(piece) },
      ];
      return ok(
        apply && piece
          ? `Applied CTR title on piece ${piece.id}`
          : `CTR title suggestions (${suggestions.length})${piece ? "" : " — no matching piece to apply"}`,
        refs,
        { suggestions, applied: Boolean(apply && piece), contentPieceId: piece?.id, liveCmsUnchanged: true },
      );
    },
  };

  const suggestInternalLinks: AgentTool = {
    name: "suggest_internal_links",
    description: "Plan internal links from published posts; wrap outbound anchors on unpublished drafts only.",
    risk: "write",
    creditCost: 2,
    async execute(args) {
      const projectId = Number(args.projectId);
      const keyword = typeof args.keyword === "string" ? args.keyword : "";
      const url = typeof args.url === "string" ? args.url : "";
      const apply = args.apply !== false;
      if (!Number.isFinite(projectId)) return fail("projectId required");

      const rows = await db
        .select({
          id: contentPiecesTable.id,
          title: contentPiecesTable.title,
          bodyMarkdown: contentPiecesTable.bodyMarkdown,
          publishedUrl: contentPiecesTable.publishedUrl,
          status: contentPiecesTable.status,
          pieceMetadata: contentPiecesTable.pieceMetadata,
          targetKeyword: contentPiecesTable.targetKeyword,
        })
        .from(contentPiecesTable)
        .where(eq(contentPiecesTable.websiteProjectId, projectId))
        .orderBy(desc(contentPiecesTable.updatedAt))
        .limit(80);

      const posts: LinkSourcePost[] = rows
        .filter((row) => row.publishedUrl)
        .map((row) => ({
          id: row.id,
          url: row.publishedUrl!,
          title: row.title,
          body: row.bodyMarkdown ?? undefined,
        }));

      const target = rows.find((row) => (url && row.publishedUrl === url) || (keyword && row.targetKeyword === keyword));
      const targetUrl = url || target?.publishedUrl || "";
      const inbound = planInternalLinks({
        targetUrl: targetUrl || "https://example.invalid/new",
        targetKeyword: keyword || target?.title || "",
        posts,
      });

      const metaLinks =
        target?.pieceMetadata && Array.isArray(target.pieceMetadata.internalLinkSuggestions)
          ? target.pieceMetadata.internalLinkSuggestions
          : [];
      const outboundCandidates = [
        ...metaLinks.map((row) => ({
          anchorText: row.anchorText,
          suggestedSlug: row.suggestedSlug,
        })),
        ...(inbound
          ? posts
              .filter((post) => inbound.postIds.includes(post.id))
              .map((post) => ({
                anchorText: inbound.anchorText,
                suggestedSlug: post.url,
              }))
          : []),
      ];

      let body = target?.bodyMarkdown ?? "";
      let wrapped = 0;
      const canWrapDraft = Boolean(apply && target && target.status !== "published" && target.status !== "publishing");
      if (canWrapDraft && body) {
        const suggestions = suggestOutboundInternalLinks({
          bodyMarkdown: body,
          candidates: outboundCandidates,
        });
        const applied = applyInternalLinksToMarkdown(body, suggestions);
        if (applied.markdown !== body) {
          body = applied.markdown;
          wrapped = applied.applied;
          await db
            .update(contentPiecesTable)
            .set({
              bodyMarkdown: body,
              pieceMetadata: {
                ...(target!.pieceMetadata ?? {}),
                internalLinkPlan: inbound,
                outboundInternalLinksApplied: wrapped,
              },
              updatedAt: new Date(),
            })
            .where(eq(contentPiecesTable.id, target!.id));
        }
      } else if (apply && target) {
        await db
          .update(contentPiecesTable)
          .set({
            pieceMetadata: {
              ...(target.pieceMetadata ?? {}),
              internalLinkPlan: inbound,
            },
            updatedAt: new Date(),
          })
          .where(eq(contentPiecesTable.id, target.id));
      }

      const refs: EvidenceRef[] = inbound
        ? inbound.postIds.slice(0, 6).map((id) => ({
            source: `internal_link post ${id}`,
            verified: true,
          }))
        : [];
      return ok(
        inbound
          ? `Internal links: anchor “${inbound.anchorText}” from ${inbound.postIds.length} posts${wrapped ? `; wrapped ${wrapped} draft anchors` : ""}`
          : "No honest internal-link anchor found in published posts",
        refs,
        {
          inbound,
          wrapped,
          contentPieceId: target?.id,
          liveCmsUnchanged: true,
          note: "Does not PATCH WordPress. Drafts may get markdown wraps; published pieces only store a plan.",
        },
      );
    },
  };

  return [suggestCtrTitle, suggestInternalLinks];
}
