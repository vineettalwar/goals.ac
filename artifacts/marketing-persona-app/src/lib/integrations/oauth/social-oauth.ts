import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  assertOAuthSessionUser,
  decodeSignedOAuthState,
  encodeSignedOAuthState,
  type SignedOAuthPayload,
} from "@/lib/integrations/oauth/oauth-state";
import { getAccessibleProject } from "@/lib/org/org-access";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { fetchLinkedInAuthorUrn } from "@workspace/connectors/linkedin";
import { fetchMetaPages, type MetaPageInfo, exchangeMetaLongLivedToken } from "@workspace/connectors/meta";
import {
  decryptCmsCredentials,
  type CmsIntegrationCredentials,
} from "@workspace/content-engine/support/cms-integrations";
import {
  generatePkce,
  saveProjectCreds,
} from "@workspace/content-engine/support/social-tokens";
import { assertSocialPublishingEnabled } from "../../platform/platform-settings";

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

export type OAuthState = SignedOAuthPayload & {
  platform: "linkedin" | "twitter" | "meta" | "bluesky" | "mastodon";
};

export function getNextApiOrigin(): string {
  const nextAuth = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (nextAuth) return nextAuth;
  const appOrigin = process.env.APP_ORIGIN?.split(",")[0]?.trim().replace(/\/$/, "");
  if (appOrigin) return appOrigin;
  return "http://localhost:3001";
}

export function getNextFrontendOrigin(): string {
  return getNextApiOrigin();
}

function encodeState(state: Omit<OAuthState, "exp" | "nonce">): string {
  return encodeSignedOAuthState(state);
}

export function decodeState(raw: string): OAuthState | null {
  const state = decodeSignedOAuthState<OAuthState>(raw);
  if (!state) return null;
  return state;
}

async function validateOAuthState(state: OAuthState | null): Promise<OAuthState> {
  if (!state) {
    throw new Error("Invalid OAuth state");
  }
  await assertOAuthSessionUser(state.userId);
  return state;
}

function publishingRedirect(_projectId: number, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`${getNextFrontendOrigin()}/integrations?${qs}`);
}

export async function startLinkedInOAuth(projectId: number, userId: number): Promise<never> {
  await assertSocialPublishingEnabled();
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    throw new Error("LinkedIn OAuth is not configured");
  }
  const state = encodeState({ projectId, userId, platform: "linkedin" });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: `${getNextApiOrigin()}/api/auth/linkedin/callback`,
    state,
    scope: "openid profile w_member_social email",
  });
  redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}

export async function handleLinkedInCallback(code: string, stateRaw: string): Promise<never> {
  let state: OAuthState;
  try {
    state = await validateOAuthState(decodeState(stateRaw));
    if (state.platform !== "linkedin") {
      throw new Error("Invalid OAuth state");
    }
  } catch {
    throw new Error("Invalid OAuth state");
  }

  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${getNextApiOrigin()}/api/auth/linkedin/callback`,
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
      }),
    });
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!tokenData.access_token) {
      publishingRedirect(state.projectId, { linkedin: "error" });
    }

    const authorUrn = await fetchLinkedInAuthorUrn(tokenData.access_token);
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as { name?: string };

    const project = await getAccessibleProject(state.projectId, state.userId);
    if (!project) throw new Error("Project not found");

    const existing = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    existing.linkedin = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      authorUrn,
      displayName: profile.name,
    };
    await saveProjectCreds(state.projectId, state.userId, existing);
    publishingRedirect(state.projectId, { linkedin: "connected" });
  } catch {
    publishingRedirect(state.projectId, { linkedin: "error" });
  }
}

export async function startTwitterOAuth(projectId: number, userId: number): Promise<never> {
  await assertSocialPublishingEnabled();
  if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
    throw new Error("X OAuth is not configured");
  }
  const { verifier, challenge } = generatePkce();
  const state = encodeState({ projectId, userId, platform: "twitter", codeVerifier: verifier });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: `${getNextApiOrigin()}/api/auth/twitter/callback`,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
}

export async function handleTwitterCallback(code: string, stateRaw: string): Promise<never> {
  let state: OAuthState;
  try {
    state = await validateOAuthState(decodeState(stateRaw));
    if (state.platform !== "twitter" || !state.codeVerifier) {
      throw new Error("Invalid OAuth state");
    }
  } catch {
    throw new Error("Invalid OAuth state");
  }

  try {
    const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${getNextApiOrigin()}/api/auth/twitter/callback`,
        code_verifier: state.codeVerifier,
      }),
    });
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!tokenData.access_token) {
      publishingRedirect(state.projectId, { twitter: "error" });
    }

    const meRes = await fetch("https://api.x.com/2/users/me?user.fields=username", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = (await meRes.json()) as { data?: { id?: string; username?: string } };

    const project = await getAccessibleProject(state.projectId, state.userId);
    if (!project) throw new Error("Project not found");

    const existing = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    existing.twitter = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      userId: me.data?.id,
      screenName: me.data?.username,
    };
    await saveProjectCreds(state.projectId, state.userId, existing);
    publishingRedirect(state.projectId, { twitter: "connected" });
  } catch {
    publishingRedirect(state.projectId, { twitter: "error" });
  }
}

export async function startMetaOAuth(projectId: number, userId: number): Promise<never> {
  await assertSocialPublishingEnabled();
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error("Meta OAuth is not configured");
  }
  const state = encodeState({ projectId, userId, platform: "meta" });
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: `${getNextApiOrigin()}/api/auth/meta/callback`,
    state,
    scope: "pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management",
    response_type: "code",
  });
  redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`);
}

export async function handleMetaCallback(code: string, stateRaw: string): Promise<never> {
  let state: OAuthState;
  try {
    state = await validateOAuthState(decodeState(stateRaw));
    if (state.platform !== "meta") {
      throw new Error("Invalid OAuth state");
    }
  } catch {
    throw new Error("Invalid OAuth state");
  }

  try {
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(`${getNextApiOrigin()}/api/auth/meta/callback`)}&client_secret=${META_APP_SECRET}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      publishingRedirect(state.projectId, { meta: "error" });
    }

    let userAccessToken = tokenData.access_token;
    let tokenExpiresAt: number | undefined;
    if (META_APP_ID && META_APP_SECRET) {
      try {
        const longLived = await exchangeMetaLongLivedToken(
          tokenData.access_token,
          META_APP_ID,
          META_APP_SECRET,
        );
        userAccessToken = longLived.accessToken;
        if (longLived.expiresIn) {
          tokenExpiresAt = Date.now() + longLived.expiresIn * 1000;
        }
      } catch {
        // Fall back to short-lived token; page tokens may still work briefly
      }
    }

    const pages = await fetchMetaPages(userAccessToken);
    if (pages.length === 0) {
      publishingRedirect(state.projectId, { meta: "no_pages" });
    }

    const pagesToken = crypto.randomBytes(16).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set(`meta_pages_${pagesToken}`, JSON.stringify({
      pages,
      userId: state.userId,
      projectId: state.projectId,
      tokenExpiresAt,
    }), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    publishingRedirect(state.projectId, { meta: "select_page", token: pagesToken });
  } catch {
    publishingRedirect(state.projectId, { meta: "error" });
  }
}

export async function getMetaPagesSession(token: string, userId: number) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(`meta_pages_${token}`)?.value;
  if (!raw) return null;
  const data = JSON.parse(raw) as {
    pages: MetaPageInfo[];
    userId: number;
    projectId: number;
    tokenExpiresAt?: number;
  };
  if (data.userId !== userId) return null;
  return data;
}

export async function selectMetaPage(token: string, pageId: string, userId: number) {
  const data = await getMetaPagesSession(token, userId);
  if (!data) throw new Error("Page selection session expired");

  const page = data.pages.find((p) => p.pageId === pageId);
  if (!page) throw new Error("Page not found");

  const project = await getAccessibleProject(data.projectId, userId);
  if (!project) throw new Error("Project not found");

  const existing = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
  existing.meta = {
    accessToken: page.pageAccessToken,
    pageId: page.pageId,
    pageName: page.pageName,
    instagramAccountId: page.instagramAccountId,
    instagramUsername: page.instagramUsername,
    expiresAt: data.tokenExpiresAt,
  };
  await saveProjectCreds(data.projectId, userId, existing);

  const cookieStore = await cookies();
  cookieStore.delete(`meta_pages_${token}`);
}

export async function startMastodonOAuth(
  projectId: number,
  userId: number,
  instanceRaw: string,
): Promise<never> {
  const { normalizeMastodonInstance, registerMastodonApp } = await import("@workspace/connectors/mastodon");
  const instanceUrl = normalizeMastodonInstance(instanceRaw);
  const redirectUri = `${getNextApiOrigin()}/api/auth/mastodon/callback`;
  const { clientId, clientSecret } = await registerMastodonApp(instanceUrl, redirectUri);

  const mastodonToken = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(`mastodon_oauth_${mastodonToken}`, JSON.stringify({
    mastodonInstance: instanceUrl,
    mastodonClientId: clientId,
    mastodonClientSecret: clientSecret,
    projectId,
    userId,
  }), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  const state = encodeState({
    projectId,
    userId,
    platform: "mastodon",
    mastodonToken,
    mastodonInstance: instanceUrl,
    mastodonClientId: clientId,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read write:statuses",
    state,
  });

  redirect(`${instanceUrl}/oauth/authorize?${params}`);
}

export async function handleMastodonCallback(code: string, stateRaw: string): Promise<never> {
  let state: OAuthState;
  try {
    state = await validateOAuthState(decodeState(stateRaw));
    if (
      state.platform !== "mastodon" ||
      !state.mastodonInstance ||
      !state.mastodonClientId ||
      !state.mastodonToken
    ) {
      throw new Error("Invalid OAuth state");
    }
  } catch {
    throw new Error("Invalid OAuth state");
  }

  const cookieStore = await cookies();
  const sessionRaw = cookieStore.get(`mastodon_oauth_${state.mastodonToken}`)?.value;
  if (!sessionRaw) {
    throw new Error("Mastodon OAuth session expired");
  }
  const session = JSON.parse(sessionRaw) as {
    mastodonInstance: string;
    mastodonClientId: string;
    mastodonClientSecret: string;
    projectId: number;
    userId: number;
  };
  if (session.userId !== state.userId || session.projectId !== state.projectId) {
    throw new Error("Invalid Mastodon OAuth session");
  }

  try {
    await assertPublicUrl(session.mastodonInstance);
    const redirectUri = `${getNextApiOrigin()}/api/auth/mastodon/callback`;
    const tokenRes = await fetch(`${session.mastodonInstance}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: session.mastodonClientId,
        client_secret: session.mastodonClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      publishingRedirect(state.projectId, { mastodon: "error" });
    }

    const { fetchMastodonAccount } = await import("@workspace/connectors/mastodon");
    const account = await fetchMastodonAccount(session.mastodonInstance, tokenData.access_token);

    const project = await getAccessibleProject(state.projectId, state.userId);
    if (!project) throw new Error("Project not found");

    const existing = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    existing.mastodon = {
      instanceUrl: session.mastodonInstance,
      accessToken: tokenData.access_token,
      accountId: account.id,
      username: account.username,
      clientId: session.mastodonClientId,
      clientSecret: session.mastodonClientSecret,
    };
    await saveProjectCreds(state.projectId, state.userId, existing);
    cookieStore.delete(`mastodon_oauth_${state.mastodonToken}`);
    publishingRedirect(state.projectId, { mastodon: "connected" });
  } catch {
    publishingRedirect(state.projectId, { mastodon: "error" });
  }
}
