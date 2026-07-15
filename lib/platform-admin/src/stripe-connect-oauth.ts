import crypto from "node:crypto";
import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";
import { invalidateStripeClientCache } from "@workspace/billing";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface StripeConnectOAuthState {
  userId: number;
  kind: "stripe_connect";
  exp: number;
  nonce: string;
}

export type StripeConnectEnv = {
  authSecret: string;
  stripeConnectClientId?: string;
  stripeSecretKey?: string;
  apiOrigin: string;
  appOrigin: string;
};

export type StripeConnectTokenResponse = {
  access_token: string;
  refresh_token?: string;
  stripe_user_id: string;
  livemode: boolean;
  scope?: string;
  token_type?: string;
};

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

export function encodeStripeConnectState(userId: number, authSecret: string): string {
  const payload: StripeConnectOAuthState = {
    userId,
    kind: "stripe_connect",
    exp: Date.now() + OAUTH_STATE_TTL_MS,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, authSecret)}`;
}

export function decodeStripeConnectState(
  raw: string,
  authSecret: string,
): StripeConnectOAuthState | null {
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(body, authSecret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as StripeConnectOAuthState;
    if (payload.kind !== "stripe_connect") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.userId !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

export function stripeConnectRedirectUri(apiOrigin: string): string {
  return `${apiOrigin.replace(/\/+$/, "")}/api/admin/stripe-connect/callback`;
}

export function buildStripeConnectAuthorizeUrl(userId: number, env: StripeConnectEnv): string | null {
  const clientId = env.stripeConnectClientId?.trim();
  if (!clientId) return null;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: stripeConnectRedirectUri(env.apiOrigin),
    state: encodeStripeConnectState(userId, env.authSecret),
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

export function adminIntegrationsAppUrl(appOrigin: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${appOrigin.replace(/\/+$/, "")}/admin/integrations?${qs}`;
}

async function loadBootstrapSecret(env: StripeConnectEnv): Promise<string | null> {
  const fromEnv = env.stripeSecretKey?.trim();
  if (fromEnv) return fromEnv;

  const [row] = await db
    .select({
      encryptedStripeSecretKey: platformSettingsTable.encryptedStripeSecretKey,
      encryptedStripeConnectAccessToken: platformSettingsTable.encryptedStripeConnectAccessToken,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  if (row?.encryptedStripeSecretKey) {
    try {
      return decryptSecret(row.encryptedStripeSecretKey);
    } catch {
      /* fall through */
    }
  }

  if (row?.encryptedStripeConnectAccessToken) {
    try {
      return decryptSecret(row.encryptedStripeConnectAccessToken);
    } catch {
      return null;
    }
  }

  return null;
}

export async function exchangeStripeConnectCode(
  code: string,
  env: StripeConnectEnv,
): Promise<StripeConnectTokenResponse> {
  const clientId = env.stripeConnectClientId?.trim();
  if (!clientId) throw new Error("Stripe Connect is not configured");

  const clientSecret = await loadBootstrapSecret(env);
  if (!clientSecret) {
    throw new Error(
      "Set STRIPE_SECRET_KEY in env or save a secret key once before connecting with Stripe",
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_secret: clientSecret,
  });

  const res = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as StripeConnectTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token || !data.stripe_user_id) {
    throw new Error(data.error_description ?? data.error ?? "Stripe Connect token exchange failed");
  }

  return data;
}

export async function saveStripeConnectTokens(
  tokens: StripeConnectTokenResponse,
  updatedBy: number,
): Promise<void> {
  await db
    .insert(platformSettingsTable)
    .values({
      id: 1,
      encryptedStripeConnectAccessToken: encryptSecret(tokens.access_token),
      encryptedStripeConnectRefreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : null,
      stripeConnectAccountId: tokens.stripe_user_id,
      stripeConnectLivemode: tokens.livemode,
      stripeConnectConnectedAt: new Date(),
      updatedBy,
    })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: {
        encryptedStripeConnectAccessToken: encryptSecret(tokens.access_token),
        encryptedStripeConnectRefreshToken: tokens.refresh_token
          ? encryptSecret(tokens.refresh_token)
          : null,
        stripeConnectAccountId: tokens.stripe_user_id,
        stripeConnectLivemode: tokens.livemode,
        stripeConnectConnectedAt: new Date(),
        updatedBy,
      },
    });

  invalidateStripeClientCache();
}
