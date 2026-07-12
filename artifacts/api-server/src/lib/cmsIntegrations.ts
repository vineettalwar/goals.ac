import { encryptSecret, decryptSecret } from "@workspace/security/encryption";

export interface CmsIntegrationCredentials {
  notion?: {
    integrationToken: string;
    databaseId: string;
  };
  webflow?: {
    apiToken: string;
    collectionId: string;
    bodyFieldSlug: string;
  };
  wordpress?: {
    siteUrl: string;
    username: string;
    appPassword: string;
  };
  linkedin?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    authorUrn: string;
    displayName?: string;
  };
  twitter?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    userId?: string;
    screenName?: string;
  };
  meta?: {
    accessToken: string;
    expiresAt?: number;
    pageId: string;
    pageName?: string;
    instagramAccountId?: string;
    instagramUsername?: string;
  };
}

export type SocialPlatform = "linkedin" | "twitter" | "instagram" | "facebook";

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["linkedin", "twitter", "instagram", "facebook"];

export function encryptCmsCredentials(creds: CmsIntegrationCredentials): CmsIntegrationCredentials {
  const result: CmsIntegrationCredentials = {};
  if (creds.notion) {
    result.notion = {
      integrationToken: encryptSecret(creds.notion.integrationToken),
      databaseId: creds.notion.databaseId,
    };
  }
  if (creds.webflow) {
    result.webflow = {
      apiToken: encryptSecret(creds.webflow.apiToken),
      collectionId: creds.webflow.collectionId,
      bodyFieldSlug: creds.webflow.bodyFieldSlug,
    };
  }
  if (creds.wordpress) {
    result.wordpress = {
      siteUrl: creds.wordpress.siteUrl,
      username: encryptSecret(creds.wordpress.username),
      appPassword: encryptSecret(creds.wordpress.appPassword),
    };
  }
  if (creds.linkedin) {
    result.linkedin = {
      accessToken: encryptSecret(creds.linkedin.accessToken),
      refreshToken: creds.linkedin.refreshToken ? encryptSecret(creds.linkedin.refreshToken) : undefined,
      expiresAt: creds.linkedin.expiresAt,
      authorUrn: creds.linkedin.authorUrn,
      displayName: creds.linkedin.displayName,
    };
  }
  if (creds.twitter) {
    result.twitter = {
      accessToken: encryptSecret(creds.twitter.accessToken),
      refreshToken: creds.twitter.refreshToken ? encryptSecret(creds.twitter.refreshToken) : undefined,
      expiresAt: creds.twitter.expiresAt,
      userId: creds.twitter.userId,
      screenName: creds.twitter.screenName,
    };
  }
  if (creds.meta) {
    result.meta = {
      accessToken: encryptSecret(creds.meta.accessToken),
      expiresAt: creds.meta.expiresAt,
      pageId: creds.meta.pageId,
      pageName: creds.meta.pageName,
      instagramAccountId: creds.meta.instagramAccountId,
      instagramUsername: creds.meta.instagramUsername,
    };
  }
  return result;
}

export function decryptCmsCredentials(stored: CmsIntegrationCredentials): CmsIntegrationCredentials {
  const result: CmsIntegrationCredentials = {};
  if (stored.notion) {
    try {
      result.notion = {
        integrationToken: decryptSecret(stored.notion.integrationToken),
        databaseId: stored.notion.databaseId,
      };
    } catch {
      result.notion = stored.notion;
    }
  }
  if (stored.webflow) {
    try {
      result.webflow = {
        apiToken: decryptSecret(stored.webflow.apiToken),
        collectionId: stored.webflow.collectionId,
        bodyFieldSlug: stored.webflow.bodyFieldSlug,
      };
    } catch {
      result.webflow = stored.webflow;
    }
  }
  if (stored.wordpress) {
    try {
      result.wordpress = {
        siteUrl: stored.wordpress.siteUrl,
        username: decryptSecret(stored.wordpress.username),
        appPassword: decryptSecret(stored.wordpress.appPassword),
      };
    } catch {
      result.wordpress = stored.wordpress;
    }
  }
  if (stored.linkedin) {
    try {
      result.linkedin = {
        accessToken: decryptSecret(stored.linkedin.accessToken),
        refreshToken: stored.linkedin.refreshToken ? decryptSecret(stored.linkedin.refreshToken) : undefined,
        expiresAt: stored.linkedin.expiresAt,
        authorUrn: stored.linkedin.authorUrn,
        displayName: stored.linkedin.displayName,
      };
    } catch {
      result.linkedin = stored.linkedin;
    }
  }
  if (stored.twitter) {
    try {
      result.twitter = {
        accessToken: decryptSecret(stored.twitter.accessToken),
        refreshToken: stored.twitter.refreshToken ? decryptSecret(stored.twitter.refreshToken) : undefined,
        expiresAt: stored.twitter.expiresAt,
        userId: stored.twitter.userId,
        screenName: stored.twitter.screenName,
      };
    } catch {
      result.twitter = stored.twitter;
    }
  }
  if (stored.meta) {
    try {
      result.meta = {
        accessToken: decryptSecret(stored.meta.accessToken),
        expiresAt: stored.meta.expiresAt,
        pageId: stored.meta.pageId,
        pageName: stored.meta.pageName,
        instagramAccountId: stored.meta.instagramAccountId,
        instagramUsername: stored.meta.instagramUsername,
      };
    } catch {
      result.meta = stored.meta;
    }
  }
  return result;
}

export function maskCmsCredentials(decrypted: CmsIntegrationCredentials): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (decrypted.notion) {
    const tok = decrypted.notion.integrationToken;
    result.notion = {
      connected: true,
      databaseId: decrypted.notion.databaseId,
      integrationTokenHint: tok.length > 8 ? `...${tok.slice(-4)}` : "****",
    };
  }
  if (decrypted.webflow) {
    const tok = decrypted.webflow.apiToken;
    result.webflow = {
      connected: true,
      collectionId: decrypted.webflow.collectionId,
      bodyFieldSlug: decrypted.webflow.bodyFieldSlug,
      apiTokenHint: tok.length > 8 ? `...${tok.slice(-4)}` : "****",
    };
  }
  if (decrypted.wordpress) {
    const tok = decrypted.wordpress.username;
    result.wordpress = {
      connected: true,
      siteUrl: decrypted.wordpress.siteUrl,
      usernameHint: tok.length > 8 ? `...${tok.slice(-4)}` : "****",
    };
  }
  if (decrypted.linkedin) {
    result.linkedin = {
      connected: true,
      displayName: decrypted.linkedin.displayName,
      authorUrn: decrypted.linkedin.authorUrn,
      expiresAt: decrypted.linkedin.expiresAt,
    };
  }
  if (decrypted.twitter) {
    result.twitter = {
      connected: true,
      screenName: decrypted.twitter.screenName,
      userId: decrypted.twitter.userId,
      expiresAt: decrypted.twitter.expiresAt,
    };
  }
  if (decrypted.meta) {
    result.meta = {
      connected: true,
      pageId: decrypted.meta.pageId,
      pageName: decrypted.meta.pageName,
      instagramAccountId: decrypted.meta.instagramAccountId,
      instagramUsername: decrypted.meta.instagramUsername,
      expiresAt: decrypted.meta.expiresAt,
    };
  }
  return result;
}

export function getConnectedSocialPlatforms(creds: CmsIntegrationCredentials): SocialPlatform[] {
  const platforms: SocialPlatform[] = [];
  if (creds.linkedin) platforms.push("linkedin");
  if (creds.twitter) platforms.push("twitter");
  if (creds.meta?.instagramAccountId) platforms.push("instagram");
  if (creds.meta?.pageId) platforms.push("facebook");
  return platforms;
}
