import { db } from "@workspace/db";
import {
  contentPiecesTable,
  websiteProjectsTable,
  type ContentPiece,
  type ContentPieceMetadata,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { findWordPressPostByUrl } from "@workspace/connectors/wordpress";
import {
  decryptCmsCredentials,
  resolveWordPressConnectionType,
} from "../support/publishing/cms-integrations";
import {
  importPageFromUrl,
  wordCountFromMarkdown,
  type PageExtractOk,
} from "../content/page-refresh-import";

export type CreateRefreshPieceInput = {
  projectId: number;
  url: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  bodyMarkdown?: string;
  titleHint?: string;
  confirmCanonical?: boolean;
  refreshOf?: number;
  cmsRemoteId?: string;
};

export type CreateRefreshPieceResult =
  | {
      ok: true;
      piece: ContentPiece;
      warnings: {
        truncated: boolean;
        cmsRemoteMatched: boolean;
        cmsRemoteId: string | null;
        cmsRemoteLink: string | null;
      };
    }
  | {
      ok: false;
      status: 400 | 422;
      error: string;
      pasteFallback?: true;
      needsCanonicalConfirm?: true;
      enteredUrl?: string;
      fetchedCanonicalUrl?: string;
      title?: string;
    };

function normalizeUrlKey(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.host.toLowerCase()}${path}`.toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

async function resolveWordPressRemote(
  projectId: number,
  pageUrl: string,
  manualId?: string,
): Promise<{ id?: string; link?: string }> {
  if (manualId?.trim()) return { id: manualId.trim() };

  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
  if (!creds.wordpress) return {};
  const wpType = resolveWordPressConnectionType(creds.wordpress);
  if (wpType === "plugin" || !creds.wordpress.username || !creds.wordpress.appPassword) {
    return {};
  }
  try {
    const match = await findWordPressPostByUrl(
      {
        siteUrl: creds.wordpress.siteUrl,
        username: creds.wordpress.username,
        appPassword: creds.wordpress.appPassword,
      },
      pageUrl,
    );
    if (!match) return {};
    return { id: String(match.id), link: match.link };
  } catch {
    return {};
  }
}

function intendedWordpress(projectCms: Record<string, unknown> | null | undefined): boolean {
  const creds = decryptCmsCredentials((projectCms ?? {}) as Record<string, unknown>);
  return Boolean(creds.wordpress);
}

/**
 * Import a live URL (or pasted markdown) into a draft content piece for the
 * Content Refresh Loop. Shared by Next and CF write workers.
 */
export async function createRefreshContentPiece(
  input: CreateRefreshPieceInput,
): Promise<CreateRefreshPieceResult> {
  try {
    await assertPublicUrl(input.url);
  } catch (err) {
    return {
      ok: false,
      status: 422,
      error: err instanceof Error ? err.message : "Invalid URL",
    };
  }

  const extracted = await importPageFromUrl(input.url, {
    websiteProjectId: input.projectId,
    bodyMarkdown: input.bodyMarkdown,
    titleHint: input.titleHint,
  });
  if (!extracted.ok) {
    return {
      ok: false,
      status: 422,
      error: extracted.error,
      pasteFallback: true,
    };
  }

  if (
    extracted.canonicalUrl &&
    normalizeUrlKey(extracted.canonicalUrl) !== normalizeUrlKey(input.url) &&
    !input.confirmCanonical
  ) {
    return {
      ok: false,
      status: 422,
      error: "Canonical URL differs from the URL you entered",
      needsCanonicalConfirm: true,
      enteredUrl: input.url,
      fetchedCanonicalUrl: extracted.canonicalUrl,
      title: extracted.title,
    };
  }

  return persistRefreshPiece(input, extracted);
}

async function persistRefreshPiece(
  input: CreateRefreshPieceInput,
  extracted: PageExtractOk,
): Promise<Extract<CreateRefreshPieceResult, { ok: true }>> {
  const pageUrl = extracted.canonicalUrl ?? input.url;
  const remote = await resolveWordPressRemote(input.projectId, pageUrl, input.cmsRemoteId);

  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, input.projectId))
    .limit(1);

  const pieceMetadata: ContentPieceMetadata = {
    source: "refresh",
    sourceUrl: input.url,
    fetchedCanonicalUrl: extracted.canonicalUrl ?? undefined,
    refreshOf: input.refreshOf,
    focusKeyword: input.targetKeyword,
    secondaryKeywords: input.secondaryKeywords?.length ? input.secondaryKeywords : undefined,
    intendedPublishPlatform: intendedWordpress(project?.cmsIntegrations as Record<string, unknown>)
      ? "wordpress"
      : undefined,
    extractTruncated: extracted.truncated || undefined,
    ...(remote.id ? { cmsRemoteId: remote.id, cmsRemoteLink: remote.link } : {}),
  };

  const [inserted] = await db
    .insert(contentPiecesTable)
    .values({
      websiteProjectId: input.projectId,
      formatType: "blog_post",
      title: extracted.title,
      targetKeyword: input.targetKeyword,
      bodyMarkdown: extracted.bodyMarkdown,
      wordCount: wordCountFromMarkdown(extracted.bodyMarkdown),
      status: "draft",
      publishedUrl: pageUrl,
      pieceMetadata,
    })
    .returning();

  return {
    ok: true,
    piece: inserted!,
    warnings: {
      truncated: extracted.truncated,
      cmsRemoteMatched: Boolean(remote.id),
      cmsRemoteId: remote.id ?? null,
      cmsRemoteLink: remote.link ?? null,
    },
  };
}
