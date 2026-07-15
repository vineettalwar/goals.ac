import { Agent } from "@atproto/api";
import {
  NodeOAuthClient,
  type NodeSavedSession,
  type NodeSavedState,
  type OAuthSession,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import type { BlueskyCredentials } from "@workspace/connectors/bluesky";
import { publishToBluesky, testBlueskyConnection } from "@workspace/connectors/bluesky";
import { resolveBlueskyOAuthCredentials } from "@workspace/content-engine/support/social/bluesky-platform-credentials";

const oauthStateStore = new Map<string, { state: NodeSavedState; expiresAt: number }>();
const oauthSessionStore = new Map<string, NodeSavedSession>();

function pruneStateStore(): void {
  const now = Date.now();
  for (const [key, entry] of oauthStateStore) {
    if (entry.expiresAt < now) oauthStateStore.delete(key);
  }
}

let oauthClientPromise: Promise<NodeOAuthClient> | null = null;

/** Drop cached AT Proto client after admin credential changes. */
export function invalidateBlueskyOAuthClient(): void {
  oauthClientPromise = null;
}

export function getNextApiOrigin(): string {
  const nextAuth = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (nextAuth) return nextAuth;
  const appOrigin = process.env.APP_ORIGIN?.split(",")[0]?.trim().replace(/\/$/, "");
  if (appOrigin) return appOrigin;
  return "http://localhost:3001";
}

export function getBlueskyClientMetadataUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/oauth/bluesky-client-metadata.json`;
}

export function getBlueskyJwksUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/oauth/bluesky-jwks.json`;
}

export function getBlueskyRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/bluesky/callback`;
}

async function getBlueskyOAuthClient(origin: string): Promise<NodeOAuthClient> {
  if (!oauthClientPromise) {
    oauthClientPromise = (async () => {
      const clientId = getBlueskyClientMetadataUrl(origin);
      const redirectUri = getBlueskyRedirectUri(origin);
      const resolved = await resolveBlueskyOAuthCredentials();
      const clientName = resolved?.clientName ?? process.env.BLUESKY_CLIENT_NAME ?? "goals.ac";

      let keyset: JoseKey[];
      const jwkRaw = resolved?.privateKeyJwk;
      if (jwkRaw) {
        keyset = [await JoseKey.fromImportable(JSON.parse(jwkRaw), "goals-ac-key")];
      } else {
        // Ephemeral — OAuth breaks after restart. Prefer env or admin-stored JWK.
        keyset = [await JoseKey.generate(["RS256"], "goals-ac-key")];
      }

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
            pruneStateStore();
            oauthStateStore.set(key, {
              state: internalState,
              expiresAt: Date.now() + 60 * 60 * 1000,
            });
          },
          async get(key: string) {
            const entry = oauthStateStore.get(key);
            if (!entry || entry.expiresAt < Date.now()) {
              oauthStateStore.delete(key);
              return undefined;
            }
            return entry.state;
          },
          async del(key: string) {
            oauthStateStore.delete(key);
          },
        },
        sessionStore: {
          async set(sub: string, session: NodeSavedSession) {
            oauthSessionStore.set(sub, session);
          },
          async get(sub: string) {
            return oauthSessionStore.get(sub);
          },
          async del(sub: string) {
            oauthSessionStore.delete(sub);
          },
        },
      });
    })();
  }
  return oauthClientPromise;
}

export async function getBlueskyClientMetadata(origin: string) {
  const client = await getBlueskyOAuthClient(origin);
  return client.clientMetadata;
}

export async function getBlueskyJwks(origin: string) {
  const client = await getBlueskyOAuthClient(origin);
  return client.jwks;
}

export async function startBlueskyAuthorize(handle: string, statePayload: string): Promise<string> {
  const origin = getNextApiOrigin();
  const client = await getBlueskyOAuthClient(origin);
  const url = await client.authorize(handle.trim(), { state: statePayload });
  return typeof url === "string" ? url : url.toString();
}

export async function completeBlueskyCallback(params: URLSearchParams) {
  const origin = getNextApiOrigin();
  const client = await getBlueskyOAuthClient(origin);
  return client.callback(params);
}

export function hydrateBlueskySession(creds: BlueskyCredentials): void {
  if (!creds.sessionJson || !creds.did) return;
  try {
    oauthSessionStore.set(creds.did, JSON.parse(creds.sessionJson) as NodeSavedSession);
  } catch {
    // ignore corrupt session payload
  }
}

export async function restoreBlueskyAgent(projectId: number, creds: BlueskyCredentials): Promise<Agent> {
  void projectId;
  hydrateBlueskySession(creds);
  const origin = getNextApiOrigin();
  const client = await getBlueskyOAuthClient(origin);
  try {
    const session = await client.restore(creds.did);
    return new Agent(session);
  } catch {
    return new Agent({
      service: "https://bsky.social",
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    });
  }
}

export async function persistBlueskySession(
  session: OAuthSession,
  profile: { handle?: string },
): Promise<BlueskyCredentials> {
  const saved = oauthSessionStore.get(session.did);
  const tokenInfo = await session.getTokenInfo();
  return {
    accessToken: credsPlaceholderToken(tokenInfo),
    did: session.did,
    handle: profile.handle,
    expiresAt: tokenInfo.expiresAt?.getTime(),
    sessionJson: saved ? JSON.stringify(saved) : undefined,
  };
}

function credsPlaceholderToken(_tokenInfo: { sub: string }): string {
  return "oauth-session";
}

export async function publishBlueskyWithAgent(
  projectId: number,
  creds: BlueskyCredentials,
  bodyMarkdown: string,
) {
  const agent = await restoreBlueskyAgent(projectId, creds);
  return publishToBluesky(creds, bodyMarkdown, agent);
}

export async function testBlueskyWithAgent(projectId: number, creds: BlueskyCredentials) {
  const agent = await restoreBlueskyAgent(projectId, creds);
  return testBlueskyConnection(creds, agent);
}

export function getStoredBlueskySession(did: string): NodeSavedSession | undefined {
  return oauthSessionStore.get(did);
}
