import {
  NodeOAuthClient,
  type NodeSavedSession,
  type NodeSavedState,
  type OAuthSession,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import type { BlueskyCredentials } from "@workspace/connectors/bluesky";
import type { KvNamespaceBinding } from "@workspace/cf-edge/bindings";
import { kvGetJson, kvPutJson } from "@workspace/cf-edge/kv-cache";
import { apiOriginFromRequest } from "./auth-social-shared";

const BLUESKY_STATE_TTL_SEC = 60 * 60;
const BLUESKY_STATE_PREFIX = "bluesky_oauth_state:";
const BLUESKY_SESSION_PREFIX = "bluesky_oauth_session:";

type BlueskyAuthEnv = {
  BLUESKY_OAUTH_PRIVATE_KEY_JWK?: string;
  BLUESKY_CLIENT_NAME?: string;
  AI_CACHE?: KvNamespaceBinding;
};

let oauthClientByOrigin = new Map<string, Promise<NodeOAuthClient>>();

export function getBlueskyClientMetadataUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/oauth/bluesky-client-metadata.json`;
}

export function getBlueskyJwksUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/oauth/bluesky-jwks.json`;
}

export function getBlueskyRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/bluesky/callback`;
}

async function getBlueskyOAuthClient(
  env: BlueskyAuthEnv,
  origin: string,
): Promise<NodeOAuthClient> {
  let pending = oauthClientByOrigin.get(origin);
  if (!pending) {
    pending = (async () => {
      const clientId = getBlueskyClientMetadataUrl(origin);
      const redirectUri = getBlueskyRedirectUri(origin);
      const clientName = env.BLUESKY_CLIENT_NAME?.trim() || "goals.ac";

      let keyset: JoseKey[];
      const jwkRaw = env.BLUESKY_OAUTH_PRIVATE_KEY_JWK?.trim();
      if (jwkRaw) {
        keyset = [await JoseKey.fromImportable(JSON.parse(jwkRaw), "goals-ac-key")];
      } else {
        keyset = [await JoseKey.generate(["RS256"], "goals-ac-key")];
      }

      const kv = env.AI_CACHE;

      return new NodeOAuthClient({
        clientMetadata: {
          client_id: clientId,
          client_name: clientName,
          client_uri: origin,
          redirect_uris: [redirectUri],
          grant_types: ["authorization_code", "refresh_token"],
          scope: "atproto transition:generic",
          response_types: ["code"],
          application_type: "web",
          token_endpoint_auth_method: "private_key_jwt",
          token_endpoint_auth_signing_alg: "RS256",
          dpop_bound_access_tokens: true,
          jwks_uri: getBlueskyJwksUrl(origin),
        },
        keyset,
        stateStore: {
          async set(key: string, internalState: NodeSavedState) {
            await kvPutJson(
              kv,
              `${BLUESKY_STATE_PREFIX}${key}`,
              internalState,
              BLUESKY_STATE_TTL_SEC,
            );
          },
          async get(key: string) {
            const hit = await kvGetJson<NodeSavedState>(kv, `${BLUESKY_STATE_PREFIX}${key}`);
            return hit ?? undefined;
          },
          async del(key: string) {
            if (!kv) return;
            await kv.put(`${BLUESKY_STATE_PREFIX}${key}`, "", { expirationTtl: 1 });
          },
        },
        sessionStore: {
          async set(sub: string, session: NodeSavedSession) {
            await kvPutJson(kv, `${BLUESKY_SESSION_PREFIX}${sub}`, session);
          },
          async get(sub: string) {
            const hit = await kvGetJson<NodeSavedSession>(kv, `${BLUESKY_SESSION_PREFIX}${sub}`);
            return hit ?? undefined;
          },
          async del(sub: string) {
            if (!kv) return;
            await kv.put(`${BLUESKY_SESSION_PREFIX}${sub}`, "", { expirationTtl: 1 });
          },
        },
      });
    })();
    oauthClientByOrigin.set(origin, pending);
  }
  return pending;
}

export async function getBlueskyClientMetadata(request: Request, env: BlueskyAuthEnv) {
  const origin = apiOriginFromRequest(request);
  const client = await getBlueskyOAuthClient(env, origin);
  return client.clientMetadata;
}

export async function getBlueskyJwks(request: Request, env: BlueskyAuthEnv) {
  const origin = apiOriginFromRequest(request);
  const client = await getBlueskyOAuthClient(env, origin);
  return client.jwks;
}

export async function startBlueskyAuthorize(
  request: Request,
  env: BlueskyAuthEnv,
  handle: string,
  statePayload: string,
): Promise<string> {
  const origin = apiOriginFromRequest(request);
  const client = await getBlueskyOAuthClient(env, origin);
  const url = await client.authorize(handle.trim(), { state: statePayload });
  return typeof url === "string" ? url : url.toString();
}

export async function completeBlueskyCallback(
  request: Request,
  env: BlueskyAuthEnv,
  params: URLSearchParams,
) {
  const origin = apiOriginFromRequest(request);
  const client = await getBlueskyOAuthClient(env, origin);
  return client.callback(params);
}

export async function getStoredBlueskySession(
  env: BlueskyAuthEnv,
  _request: Request,
  did: string,
): Promise<NodeSavedSession | undefined> {
  const hit = await kvGetJson<NodeSavedSession>(env.AI_CACHE, `${BLUESKY_SESSION_PREFIX}${did}`);
  return hit ?? undefined;
}

export async function persistBlueskySession(
  request: Request,
  env: BlueskyAuthEnv,
  session: OAuthSession,
  profile: { handle?: string },
): Promise<BlueskyCredentials> {
  const saved = await getStoredBlueskySession(env, request, session.did);
  const tokenInfo = await session.getTokenInfo();
  return {
    accessToken: "oauth-session",
    did: session.did,
    handle: profile.handle,
    expiresAt: tokenInfo.expiresAt?.getTime(),
    sessionJson: saved ? JSON.stringify(saved) : undefined,
  };
}

export type BlueskyOAuthEnv = BlueskyAuthEnv;
