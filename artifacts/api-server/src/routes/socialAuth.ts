import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { fetchLinkedInAuthorUrn } from "@workspace/connectors/linkedin";
import { fetchMetaPages, type MetaPageInfo } from "@workspace/connectors/meta";
import {
  decryptCmsCredentials,
  encryptCmsCredentials,
  type CmsIntegrationCredentials,
} from "../lib/cmsIntegrations";
import {
  generatePkce,
  getApiOrigin,
  getFrontendOrigin,
  saveProjectCreds,
} from "../lib/socialTokens";

const router: IRouter = Router();

const LINKEDIN_CLIENT_ID = process.env["LINKEDIN_CLIENT_ID"];
const LINKEDIN_CLIENT_SECRET = process.env["LINKEDIN_CLIENT_SECRET"];
const TWITTER_CLIENT_ID = process.env["TWITTER_CLIENT_ID"];
const TWITTER_CLIENT_SECRET = process.env["TWITTER_CLIENT_SECRET"];
const META_APP_ID = process.env["META_APP_ID"];
const META_APP_SECRET = process.env["META_APP_SECRET"];

interface OAuthState {
  projectId: number;
  userId: number;
  platform: "linkedin" | "twitter" | "meta";
  codeVerifier?: string;
}

function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeState(raw: string): OAuthState | null {
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthState;
  } catch {
    return null;
  }
}

function redirectToPublishing(res: Response, projectId: number, params: Record<string, string>): void {
  const frontend = getFrontendOrigin();
  const qs = new URLSearchParams(params).toString();
  res.redirect(`${frontend}/projects/${projectId}/publishing?${qs}`);
}

async function verifyProjectOwnership(projectId: number, userId: number): Promise<boolean> {
  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  return !!project;
}

router.get("/auth/linkedin", requireAuth, (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    res.status(503).json({ error: "LinkedIn OAuth is not configured" });
    return;
  }
  if (isNaN(projectId)) {
    res.status(400).json({ error: "projectId query param is required" });
    return;
  }

  const state = encodeState({ projectId, userId: req.user!.userId, platform: "linkedin" });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: `${getApiOrigin()}/api/auth/linkedin/callback`,
    state,
    scope: "openid profile w_member_social email",
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

router.get("/auth/linkedin/callback", async (req, res) => {
  const { code, state: stateRaw, error } = req.query;
  if (error || !code || typeof code !== "string" || !stateRaw || typeof stateRaw !== "string") {
    res.status(400).send("LinkedIn authorization failed");
    return;
  }
  const state = decodeState(stateRaw);
  if (!state || state.platform !== "linkedin") {
    res.status(400).send("Invalid OAuth state");
    return;
  }

  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${getApiOrigin()}/api/auth/linkedin/callback`,
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
      }),
    });
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!tokenData.access_token) {
      redirectToPublishing(res, state.projectId, { linkedin: "error" });
      return;
    }

    const authorUrn = await fetchLinkedInAuthorUrn(tokenData.access_token);
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as { name?: string };

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, state.projectId), eq(websiteProjectsTable.userId, state.userId)))
      .limit(1);
    if (!project) {
      res.status(404).send("Project not found");
      return;
    }

    const existing = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    existing.linkedin = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      authorUrn,
      displayName: profile.name,
    };
    await saveProjectCreds(state.projectId, state.userId, existing);
    redirectToPublishing(res, state.projectId, { linkedin: "connected" });
  } catch (err) {
    req.log.error(err, "LinkedIn OAuth callback failed");
    redirectToPublishing(res, state.projectId, { linkedin: "error" });
  }
});

router.get("/auth/twitter", requireAuth, (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
    res.status(503).json({ error: "X OAuth is not configured" });
    return;
  }
  if (isNaN(projectId)) {
    res.status(400).json({ error: "projectId query param is required" });
    return;
  }

  const { verifier, challenge } = generatePkce();
  const state = encodeState({
    projectId,
    userId: req.user!.userId,
    platform: "twitter",
    codeVerifier: verifier,
  });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: `${getApiOrigin()}/api/auth/twitter/callback`,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  res.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
});

router.get("/auth/twitter/callback", async (req, res) => {
  const { code, state: stateRaw, error } = req.query;
  if (error || !code || typeof code !== "string" || !stateRaw || typeof stateRaw !== "string") {
    res.status(400).send("X authorization failed");
    return;
  }
  const state = decodeState(stateRaw);
  if (!state || state.platform !== "twitter" || !state.codeVerifier) {
    res.status(400).send("Invalid OAuth state");
    return;
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
        redirect_uri: `${getApiOrigin()}/api/auth/twitter/callback`,
        code_verifier: state.codeVerifier,
      }),
    });
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!tokenData.access_token) {
      redirectToPublishing(res, state.projectId, { twitter: "error" });
      return;
    }

    const meRes = await fetch("https://api.x.com/2/users/me?user.fields=username", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = (await meRes.json()) as { data?: { id?: string; username?: string } };

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, state.projectId), eq(websiteProjectsTable.userId, state.userId)))
      .limit(1);
    if (!project) {
      res.status(404).send("Project not found");
      return;
    }

    const existing = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    existing.twitter = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      userId: me.data?.id,
      screenName: me.data?.username,
    };
    await saveProjectCreds(state.projectId, state.userId, existing);
    redirectToPublishing(res, state.projectId, { twitter: "connected" });
  } catch (err) {
    req.log.error(err, "X OAuth callback failed");
    redirectToPublishing(res, state.projectId, { twitter: "error" });
  }
});

router.get("/auth/meta", requireAuth, (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!META_APP_ID || !META_APP_SECRET) {
    res.status(503).json({ error: "Meta OAuth is not configured" });
    return;
  }
  if (isNaN(projectId)) {
    res.status(400).json({ error: "projectId query param is required" });
    return;
  }

  const state = encodeState({ projectId, userId: req.user!.userId, platform: "meta" });
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: `${getApiOrigin()}/api/auth/meta/callback`,
    state,
    scope: "pages_show_list,pages_manage_posts,instagram_content_publish,business_management",
    response_type: "code",
  });
  res.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`);
});

router.get("/auth/meta/callback", async (req, res) => {
  const { code, state: stateRaw, error } = req.query;
  if (error || !code || typeof code !== "string" || !stateRaw || typeof stateRaw !== "string") {
    res.status(400).send("Meta authorization failed");
    return;
  }
  const state = decodeState(stateRaw);
  if (!state || state.platform !== "meta") {
    res.status(400).send("Invalid OAuth state");
    return;
  }

  try {
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(`${getApiOrigin()}/api/auth/meta/callback`)}&client_secret=${META_APP_SECRET}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = (await tokenRes.json()) as { access_token?: string; expires_in?: number };
    if (!tokenData.access_token) {
      redirectToPublishing(res, state.projectId, { meta: "error" });
      return;
    }

    const pages = await fetchMetaPages(tokenData.access_token);
    if (pages.length === 0) {
      redirectToPublishing(res, state.projectId, { meta: "no_pages" });
      return;
    }

    // Store pages in a short-lived cookie for page selection
    const pagesToken = crypto.randomBytes(16).toString("hex");
    res.cookie(`meta_pages_${pagesToken}`, JSON.stringify({ pages, userId: state.userId, projectId: state.projectId }), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    });
    redirectToPublishing(res, state.projectId, { meta: "select_page", token: pagesToken });
  } catch (err) {
    req.log.error(err, "Meta OAuth callback failed");
    redirectToPublishing(res, state.projectId, { meta: "error" });
  }
});

router.get("/auth/meta/pages", requireAuth, (req: Request, res: Response) => {
  const token = req.query.token;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token query param required" });
    return;
  }
  const raw = req.cookies?.[`meta_pages_${token}`];
  if (!raw) {
    res.status(404).json({ error: "Page selection session expired" });
    return;
  }
  try {
    const data = JSON.parse(raw) as { pages: MetaPageInfo[]; userId: number; projectId: number };
    if (data.userId !== req.user!.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    res.json({
      projectId: data.projectId,
      pages: data.pages.map((p) => ({
        pageId: p.pageId,
        pageName: p.pageName,
        instagramAccountId: p.instagramAccountId,
        instagramUsername: p.instagramUsername,
      })),
    });
  } catch {
    res.status(400).json({ error: "Invalid session data" });
  }
});

router.post("/auth/meta/select-page", requireAuth, async (req, res) => {
  const { token, pageId } = req.body as { token?: string; pageId?: string };
  if (!token || !pageId) {
    res.status(400).json({ error: "token and pageId are required" });
    return;
  }
  const raw = req.cookies?.[`meta_pages_${token}`];
  if (!raw) {
    res.status(404).json({ error: "Page selection session expired" });
    return;
  }

  try {
    const data = JSON.parse(raw) as { pages: MetaPageInfo[]; userId: number; projectId: number };
    if (data.userId !== req.user!.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const page = data.pages.find((p) => p.pageId === pageId);
    if (!page) {
      res.status(404).json({ error: "Page not found" });
      return;
    }

    const owned = await verifyProjectOwnership(data.projectId, req.user!.userId);
    if (!owned) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, data.projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const existing = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
    existing.meta = {
      accessToken: page.pageAccessToken,
      pageId: page.pageId,
      pageName: page.pageName,
      instagramAccountId: page.instagramAccountId,
      instagramUsername: page.instagramUsername,
    };
    await saveProjectCreds(data.projectId, req.user!.userId, existing);
    res.clearCookie(`meta_pages_${token}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Meta page selection failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
