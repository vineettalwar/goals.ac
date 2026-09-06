import { publishToLinkedIn } from "@workspace/connectors/linkedin";
import { publishThreadToTwitter, splitTwitterThread } from "@workspace/connectors/twitter";
import { publishToFacebookPage, publishToInstagram } from "@workspace/connectors/meta";
import { publishToBluesky } from "@workspace/connectors/bluesky";
import { publishToMastodon } from "@workspace/connectors/mastodon";
import type { ContentPieceImageRef } from "@workspace/db";
import {
  type CmsIntegrationCredentials,
  type SocialPlatform,
  SOCIAL_PLATFORMS,
  decryptCmsCredentials,
} from "../publishing/cms-integrations";
import { getSocialAccessToken, loadProjectCreds } from "./social-tokens";
import { featuredImageFromMetadata } from "../../articles/article-image-enricher";
import { hostFeaturedImageForPublish } from "../publishing/host-featured-image";
import { isPieceAwaitingReview } from "../../verticals/vertical-guardrails";

export interface PublishablePiece {
  id: number;
  title: string;
  bodyMarkdown: string;
  websiteProjectId: number;
  featuredImageUrl?: string;
  /**
   * The piece's approval state. Social platforms have no server-side draft
   * concept, so "held for review" is expressed the same way as the regulated-
   * vertical guardrail: `approvalStatus: "pending_review"` or
   * `pieceMetadata.requiresReview`. See `assertSocialReviewCleared` below.
   */
  approvalStatus?: string | null;
  pieceMetadata?: {
    images?: ContentPieceImageRef[];
    featuredImageUrl?: string;
    ogImageUrl?: string;
    requiresReview?: boolean;
  } | null;
}

/**
 * Social last-mile review gate — the social-publish equivalent of
 * `assertVerticalReviewCleared` in publish-destination.ts. There is no CMS-style
 * "publish as draft" for LinkedIn/X/etc., so a social piece held for human review
 * (autopilot's "draft" publish mode, or a regulated vertical) must never reach a
 * connector. This is the single choke point every social publish call funnels
 * through — autopilot and manual publish alike.
 */
function assertSocialReviewCleared(piece: PublishablePiece): void {
  if (isPieceAwaitingReview({ approvalStatus: piece.approvalStatus, pieceMetadata: piece.pieceMetadata })) {
    throw new Error(
      "This post is held for human review before it can go out. Approve it first.",
    );
  }
}

export interface SocialPublishResult {
  publishedUrl: string;
  publishPlatform: SocialPlatform;
  remotePostId?: string;
}

/** User-facing copy when Instagram publish has no image after all resolution paths. */
export const INSTAGRAM_IMAGE_REQUIRED_MESSAGE =
  "Instagram posts need an image. Add a featured image or include one in the draft.";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  instagram: "Instagram",
  facebook: "Facebook",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

export function isSocialPlatform(platform: string): platform is SocialPlatform {
  return SOCIAL_PLATFORMS.includes(platform as SocialPlatform);
}

/** Resolve a public image URL for social publish: featured column → metadata → markdown → stock refs. */
export function resolveSocialImageUrl(piece: PublishablePiece): string | undefined {
  if (piece.featuredImageUrl?.trim()) return piece.featuredImageUrl.trim();

  const fromMeta = featuredImageFromMetadata({
    bodyMarkdown: piece.bodyMarkdown,
    pieceMetadata: piece.pieceMetadata,
  });
  if (fromMeta?.trim()) return fromMeta.trim();

  for (const img of piece.pieceMetadata?.images ?? []) {
    const url = (img.publishedUrl ?? img.remoteUrl)?.trim();
    if (url) return url;
  }

  const og = piece.pieceMetadata?.ogImageUrl?.trim();
  if (og) return og;

  return undefined;
}

async function resolveSocialImageUrlForPublish(piece: PublishablePiece): Promise<string | undefined> {
  const raw = resolveSocialImageUrl(piece);
  const hosted = await hostFeaturedImageForPublish(raw, {
    scope: String(piece.websiteProjectId),
    filenameBase: piece.title || "featured",
  });
  if (!hosted) return undefined;
  // Social upload paths that fetch remote media need public HTTPS.
  if (hosted.startsWith("data:")) return undefined;
  return hosted;
}

export async function publishPieceToSocial(
  platform: SocialPlatform,
  piece: PublishablePiece,
  userId: number,
  creds?: CmsIntegrationCredentials,
): Promise<SocialPublishResult> {
  assertSocialReviewCleared(piece);
  const resolvedCreds = creds ?? (await loadProjectCreds(piece.websiteProjectId, userId));
  const label = PLATFORM_LABELS[platform];

  if (platform === "linkedin") {
    if (!resolvedCreds.linkedin) {
      throw new Error(`${label} is not connected. Configure it in Project → Publishing.`);
    }
    const accessToken = await getSocialAccessToken(piece.websiteProjectId, userId, "linkedin");
    const imageUrl = await resolveSocialImageUrlForPublish(piece);
    const result = await publishToLinkedIn(
      { accessToken, authorUrn: resolvedCreds.linkedin.authorUrn },
      piece.title,
      piece.bodyMarkdown,
      { imageUrl },
    );
    return { publishedUrl: result.postUrl, publishPlatform: "linkedin", remotePostId: result.postId };
  }

  if (platform === "twitter") {
    if (!resolvedCreds.twitter) {
      throw new Error(`${label} is not connected. Configure it in Project → Publishing.`);
    }
    const accessToken = await getSocialAccessToken(piece.websiteProjectId, userId, "twitter");
    const result = await publishThreadToTwitter({ accessToken }, splitTwitterThread(piece.bodyMarkdown));
    const publishedUrl = result.postUrls[0];
    if (!publishedUrl) throw new Error("X API returned no post URL");
    return { publishedUrl, publishPlatform: "twitter", remotePostId: result.tweetIds[0] };
  }

  if (platform === "instagram") {
    if (!resolvedCreds.meta?.instagramAccountId) {
      throw new Error(
        "Instagram is not connected. Connect Meta and link an Instagram Business account in Project → Publishing.",
      );
    }
    const accessToken = await getSocialAccessToken(piece.websiteProjectId, userId, "meta");
    const imageUrl = await resolveSocialImageUrlForPublish(piece);
    if (!imageUrl) {
      throw new Error(INSTAGRAM_IMAGE_REQUIRED_MESSAGE);
    }
    const result = await publishToInstagram(
      {
        accessToken,
        pageId: resolvedCreds.meta.pageId,
        instagramAccountId: resolvedCreds.meta.instagramAccountId,
      },
      piece.bodyMarkdown,
      { imageUrl },
    );
    return { publishedUrl: result.postUrl, publishPlatform: "instagram", remotePostId: result.postId };
  }

  if (platform === "facebook") {
    if (!resolvedCreds.meta?.pageId) {
      throw new Error(`${label} is not connected. Connect Meta in Project → Publishing.`);
    }
    const accessToken = await getSocialAccessToken(piece.websiteProjectId, userId, "meta");
    const result = await publishToFacebookPage(
      {
        accessToken,
        pageId: resolvedCreds.meta.pageId,
        instagramAccountId: resolvedCreds.meta.instagramAccountId,
      },
      piece.bodyMarkdown,
    );
    return { publishedUrl: result.postUrl, publishPlatform: "facebook", remotePostId: result.postId };
  }

  if (platform === "bluesky") {
    if (!resolvedCreds.bluesky) {
      throw new Error(`${label} is not connected. Configure it in Project → Publishing.`);
    }
    const result = await publishToBluesky(resolvedCreds.bluesky, piece.bodyMarkdown);
    return { publishedUrl: result.postUrl, publishPlatform: "bluesky", remotePostId: result.postUri };
  }

  if (platform === "mastodon") {
    if (!resolvedCreds.mastodon) {
      throw new Error(`${label} is not connected. Configure it in Project → Publishing.`);
    }
    const result = await publishToMastodon(resolvedCreds.mastodon, piece.bodyMarkdown);
    return { publishedUrl: result.postUrl, publishPlatform: "mastodon", remotePostId: result.postId };
  }

  throw new Error(`Unsupported social platform: ${platform}`);
}

export { decryptCmsCredentials };
