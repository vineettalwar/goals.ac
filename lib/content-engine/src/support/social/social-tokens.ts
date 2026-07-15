import crypto from "crypto";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  encryptCmsCredentials,
} from "../publishing/cms-integrations";
import { resolveLinkedInOAuthCredentials } from "./linkedin-platform-credentials";
import { resolveTwitterOAuthCredentials } from "./twitter-platform-credentials";

function getApiOrigin(): string {
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  const appOrigin = process.env["APP_ORIGIN"];
  if (appOrigin) return appOrigin.split(",")[0]!.trim().replace(/\/$/, "");
  if (devDomain) return `https://${devDomain}`;
  return "http://localhost:8080";
}

function getFrontendOrigin(): string {
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  return process.env["APP_ORIGIN"]?.split(",")[0]?.trim().replace(/\/$/, "")
    ?? (devDomain ? `https://${devDomain}` : "http://localhost:3001");
}

async function loadProjectCreds(
  projectId: number,
  _userId: number,
): Promise<CmsIntegrationCredentials> {
  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");
  return decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
}

async function saveProjectCreds(
  projectId: number,
  _userId: number,
  creds: CmsIntegrationCredentials,
): Promise<void> {
  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");
  await db
    .update(websiteProjectsTable)
    .set({ cmsIntegrations: encryptCmsCredentials(creds) })
    .where(eq(websiteProjectsTable.id, projectId));
}

export async function refreshLinkedInToken(
  projectId: number,
  userId: number,
): Promise<string> {
  const creds = await loadProjectCreds(projectId, userId);
  if (!creds.linkedin?.refreshToken) return creds.linkedin?.accessToken ?? "";
  if (creds.linkedin.expiresAt && creds.linkedin.expiresAt > Date.now() + 60_000) {
    return creds.linkedin.accessToken;
  }
  const linkedInApp = await resolveLinkedInOAuthCredentials();
  if (!linkedInApp) {
    return creds.linkedin.accessToken;
  }

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.linkedin.refreshToken,
      client_id: linkedInApp.clientId,
      client_secret: linkedInApp.clientSecret,
    }),
  });
  if (!res.ok) throw new Error("LinkedIn token refresh failed");
  const data = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
  creds.linkedin.accessToken = data.access_token;
  if (data.refresh_token) creds.linkedin.refreshToken = data.refresh_token;
  if (data.expires_in) creds.linkedin.expiresAt = Date.now() + data.expires_in * 1000;
  await saveProjectCreds(projectId, userId, creds);
  return creds.linkedin.accessToken;
}

export async function refreshTwitterToken(
  projectId: number,
  userId: number,
): Promise<string> {
  const creds = await loadProjectCreds(projectId, userId);
  if (!creds.twitter?.refreshToken) return creds.twitter?.accessToken ?? "";
  if (creds.twitter.expiresAt && creds.twitter.expiresAt > Date.now() + 60_000) {
    return creds.twitter.accessToken;
  }
  const twitterApp = await resolveTwitterOAuthCredentials();
  if (!twitterApp) {
    return creds.twitter.accessToken;
  }

  const res = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${twitterApp.clientId}:${twitterApp.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.twitter.refreshToken,
    }),
  });
  if (!res.ok) throw new Error("X token refresh failed");
  const data = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
  creds.twitter.accessToken = data.access_token;
  if (data.refresh_token) creds.twitter.refreshToken = data.refresh_token;
  if (data.expires_in) creds.twitter.expiresAt = Date.now() + data.expires_in * 1000;
  await saveProjectCreds(projectId, userId, creds);
  return creds.twitter.accessToken;
}

export async function getSocialAccessToken(
  projectId: number,
  userId: number,
  platform: "linkedin" | "twitter" | "meta" | "bluesky" | "mastodon",
): Promise<string> {
  if (platform === "linkedin") return refreshLinkedInToken(projectId, userId);
  if (platform === "twitter") return refreshTwitterToken(projectId, userId);
  const creds = await loadProjectCreds(projectId, userId);
  if (platform === "bluesky") {
    if (!creds.bluesky?.accessToken) return "";
    if (creds.bluesky.expiresAt && creds.bluesky.expiresAt < Date.now() + 60_000) {
      throw new Error("Bluesky connection expired. Reconnect in Project → Publishing.");
    }
    return creds.bluesky.accessToken;
  }
  if (platform === "mastodon") {
    return creds.mastodon?.accessToken ?? "";
  }
  const meta = creds.meta;
  if (!meta?.accessToken) return "";
  if (meta.expiresAt && meta.expiresAt < Date.now() + 60_000) {
    throw new Error("Meta connection expired. Reconnect Facebook & Instagram in Project → Publishing.");
  }
  return meta.accessToken;
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export { getApiOrigin, getFrontendOrigin, loadProjectCreds, saveProjectCreds };
