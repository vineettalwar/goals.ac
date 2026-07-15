import type { GoalsD1Database } from "@workspace/db/d1";
import type { MetaPageInfo } from "@workspace/connectors/meta";
import { getAccessibleProject } from "@workspace/cf-edge/project-access";
import type { KvNamespaceBinding } from "@workspace/cf-edge/bindings";
import { kvGetJson, kvPutJson } from "@workspace/cf-edge/kv-cache";
import {
  appOriginFromRequest,
  loadExistingCreds,
  requireEncryptionConfigured,
  requireSessionUserId,
  saveSocialProjectCreds,
  type SocialOAuthEnv,
} from "./auth-social-shared";
import type { MetaPagesSession } from "./auth-meta";

const META_PAGES_TTL_SEC = 10 * 60;
const META_PAGES_KV_PREFIX = "meta_pages:";

export async function storeMetaPagesSession(
  kv: KvNamespaceBinding | undefined,
  token: string,
  data: MetaPagesSession,
): Promise<void> {
  await kvPutJson(kv, `${META_PAGES_KV_PREFIX}${token}`, data, META_PAGES_TTL_SEC);
}

export async function loadMetaPagesSession(
  kv: KvNamespaceBinding | undefined,
  token: string,
): Promise<MetaPagesSession | null> {
  return kvGetJson<MetaPagesSession>(kv, `${META_PAGES_KV_PREFIX}${token}`);
}

export async function deleteMetaPagesSession(
  kv: KvNamespaceBinding | undefined,
  token: string,
): Promise<void> {
  if (!kv) return;
  await kv.put(`${META_PAGES_KV_PREFIX}${token}`, "", { expirationTtl: 1 });
}

type MetaPagesEnv = SocialOAuthEnv & {
  AI_CACHE?: KvNamespaceBinding;
};

export async function handleMetaPagesList(
  request: Request,
  env: MetaPagesEnv,
): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return Response.json({ error: "token query param required" }, { status: 400 });
  }

  const secret = env.AUTH_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const appOrigin = appOriginFromRequest(request);
  const sessionResult = await requireSessionUserId(request, env, appOrigin);
  if (sessionResult instanceof Response) return sessionResult;
  const userId = sessionResult;

  const data = await loadMetaPagesSession(env.AI_CACHE, token);
  if (!data) {
    return Response.json({ error: "Page selection session expired" }, { status: 404 });
  }
  if (data.userId !== userId) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  return Response.json({
    projectId: data.projectId,
    pages: data.pages.map((page: MetaPageInfo) => ({
      pageId: page.pageId,
      pageName: page.pageName,
      instagramAccountId: page.instagramAccountId,
      instagramUsername: page.instagramUsername,
    })),
  });
}

export async function handleMetaSelectPage(
  request: Request,
  env: MetaPagesEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const encryptionError = requireEncryptionConfigured(env);
  if (encryptionError) return encryptionError;

  const secret = env.AUTH_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const appOrigin = appOriginFromRequest(request);
  const sessionResult = await requireSessionUserId(request, env, appOrigin);
  if (sessionResult instanceof Response) return sessionResult;
  const userId = sessionResult;

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    pageId?: string;
  } | null;
  const token = body?.token?.trim();
  const pageId = body?.pageId?.trim();
  if (!token || !pageId) {
    return Response.json({ error: "token and pageId are required" }, { status: 400 });
  }

  const data = await loadMetaPagesSession(env.AI_CACHE, token);
  if (!data) {
    return Response.json({ error: "Page selection session expired" }, { status: 404 });
  }
  if (data.userId !== userId) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const page = data.pages.find((entry) => entry.pageId === pageId);
  if (!page) {
    return Response.json({ error: "Page not found" }, { status: 404 });
  }

  const project = await getAccessibleProject(data.projectId, userId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const existing = loadExistingCreds(project);
  existing.meta = {
    accessToken: page.pageAccessToken,
    pageId: page.pageId,
    pageName: page.pageName,
    instagramAccountId: page.instagramAccountId,
    instagramUsername: page.instagramUsername,
    expiresAt: data.tokenExpiresAt,
  };
  await saveSocialProjectCreds(data.projectId, userId, existing, database);
  await deleteMetaPagesSession(env.AI_CACHE, token);

  return Response.json({ ok: true });
}
