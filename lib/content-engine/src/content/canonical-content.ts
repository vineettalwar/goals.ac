import type { ContentPieceMetadata } from "@workspace/db";
import type { PublishableContentPiece } from "../support/publishing/cms-publish";

export interface OutlineNode {
  level: 2 | 3 | 4;
  text: string;
  children?: OutlineNode[];
}

export interface QaPair {
  question: string;
  answer: string;
}

export interface CanonicalCitation {
  text: string;
  url: string;
  source: string;
}

export interface ImageRef {
  alt?: string;
  remoteUrl?: string;
  publishedUrl?: string;
  caption?: string;
}

export interface CanonicalContentMeta {
  title: string;
  slug?: string;
  description?: string;
  keywords?: string[];
  headings?: OutlineNode[];
  schemaOrg?: object;
  faq?: QaPair[];
  citations?: CanonicalCitation[];
  images?: ImageRef[];
}

export interface CanonicalContent {
  id: string;
  markdown: string;
  meta: CanonicalContentMeta;
  formatType?: string;
  targetKeyword?: string;
  /** Raw piece metadata for SEO mappers and image prep. */
  pieceMetadata?: ContentPieceMetadata | null;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

function extractHeadings(markdown: string): OutlineNode[] {
  const headings: OutlineNode[] = [];
  for (const line of markdown.split("\n")) {
    const match = /^(#{2,4})\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const level = match[1].length as 2 | 3 | 4;
    headings.push({ level, text: match[2].replace(/\*\*/g, "").trim() });
  }
  return headings;
}

export function buildCanonicalContent(piece: PublishableContentPiece): CanonicalContent {
  const keywords: string[] = [];
  if (piece.targetKeyword) keywords.push(piece.targetKeyword);
  if (piece.formatType) keywords.push(piece.formatType.replace(/_/g, " "));

  return {
    id: piece.id != null ? String(piece.id) : "draft",
    markdown: piece.bodyMarkdown,
    formatType: piece.formatType ?? undefined,
    targetKeyword: piece.targetKeyword ?? undefined,
    pieceMetadata: piece.pieceMetadata,
    meta: {
      title: piece.title,
      slug: slugify(piece.title),
      description: piece.pieceMetadata?.metaDescription,
      keywords: keywords.length > 0 ? keywords : undefined,
      headings: extractHeadings(piece.bodyMarkdown),
      schemaOrg:
        piece.pieceMetadata?.jsonLdSchema && typeof piece.pieceMetadata.jsonLdSchema === "object"
          ? (piece.pieceMetadata.jsonLdSchema as object)
          : undefined,
      faq: piece.pieceMetadata?.faqSection,
      citations: piece.pieceMetadata?.citations,
      images: piece.pieceMetadata?.images?.map((img) => ({
        alt: img.alt,
        remoteUrl: img.remoteUrl,
        publishedUrl: img.publishedUrl,
      })),
    },
  };
}
