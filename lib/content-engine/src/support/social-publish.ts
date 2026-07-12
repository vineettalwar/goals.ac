import { publishToLinkedIn } from "@workspace/connectors/linkedin";
import { publishThreadToTwitter, splitTwitterThread } from "@workspace/connectors/twitter";
import { publishToFacebookPage, publishToInstagram } from "@workspace/connectors/meta";
import { publishToBluesky } from "@workspace/connectors/bluesky";
import { publishToMastodon } from "@workspace/connectors/mastodon";
import {
  type CmsIntegrationCredentials,
  type SocialPlatform,
  SOCIAL_PLATFORMS,
  decryptCmsCredentials,
} from "./cms-integrations";
import { getSocialAccessToken, loadProjectCreds } from "./social-tokens";

export interface PublishablePiece {
  id: number;
  title: string;
  bodyMarkdown: string;
  websiteProjectId: number;
}

export interface SocialPublishResult {
  publishedUrl: string;
  publishPlatform: SocialPlatform;
}

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

export async function publishPieceToSocial(
  platform: SocialPlatform,
  piece: PublishablePiece,
  userId: number,
  creds?: CmsIntegrationCredentials,
): Promise<SocialPublishResult> {
  const resolvedCreds = creds ?? (await loadProjectCreds(piece.websiteProjectId, userId));
  const label = PLATFORM_LABELS[platform];

  if (platform === "linkedin") {
    if (!resolvedCreds.linkedin) {
      throw new Error(`${label} is not connected. Configure it in Project → Publishing.`);
    }
    const accessToken = await getSocialAccessToken(piece.websiteProjectId, userId, "linkedin");
    const result = await publishToLinkedIn(
      { accessToken, authorUrn: resolvedCreds.linkedin.authorUrn },
      piece.title,
      piece.bodyMarkdown,
    );
    return { publishedUrl: result.postUrl, publishPlatform: "linkedin" };
  }

  if (platform === "twitter") {
    if (!resolvedCreds.twitter) {
      throw new Error(`${label} is not connected. Configure it in Project → Publishing.`);
    }
    const accessToken = await getSocialAccessToken(piece.websiteProjectId, userId, "twitter");
    const result = await publishThreadToTwitter({ accessToken }, splitTwitterThread(piece.bodyMarkdown));
    const publishedUrl = result.postUrls[0];
    if (!publishedUrl) throw new Error("X API returned no post URL");
    return { publishedUrl, publishPlatform: "twitter" };
  }

  if (platform === "instagram") {
    if (!resolvedCreds.meta?.instagramAccountId) {
      throw new Error(
        "Instagram is not connected. Connect Meta and link an Instagram Business account in Project → Publishing.",
      );
    }
    const accessToken = await getSocialAccessToken(piece.websiteProjectId, userId, "meta");
    const result = await publishToInstagram(
      {
        accessToken,
        pageId: resolvedCreds.meta.pageId,
        instagramAccountId: resolvedCreds.meta.instagramAccountId,
      },
      piece.bodyMarkdown,
    );
    return { publishedUrl: result.postUrl, publishPlatform: "instagram" };
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
    return { publishedUrl: result.postUrl, publishPlatform: "facebook" };
  }

  if (platform === "bluesky") {
    if (!resolvedCreds.bluesky) {
      throw new Error(`${label} is not connected. Configure it in Project → Publishing.`);
    }
    const result = await publishToBluesky(resolvedCreds.bluesky, piece.bodyMarkdown);
    return { publishedUrl: result.postUrl, publishPlatform: "bluesky" };
  }

  if (platform === "mastodon") {
    if (!resolvedCreds.mastodon) {
      throw new Error(`${label} is not connected. Configure it in Project → Publishing.`);
    }
    const result = await publishToMastodon(resolvedCreds.mastodon, piece.bodyMarkdown);
    return { publishedUrl: result.postUrl, publishPlatform: "mastodon" };
  }

  throw new Error(`Unsupported social platform: ${platform}`);
}

export { decryptCmsCredentials };
