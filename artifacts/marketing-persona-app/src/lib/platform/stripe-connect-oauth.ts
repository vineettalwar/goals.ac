import crypto from "crypto";
import { redirect } from "next/navigation";
import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";
import { invalidateStripeClientCache } from "@workspace/billing";
import { getNextApiOrigin } from "@/lib/integrations/oauth/social-oauth";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface StripeConnectOAuthState {
  userId: number;
  kind: "stripe_connect";
  exp: number;
  nonce: string;
}

function signingKey(): string {
  const key = process.env.AUTH_SECRET;
  if (!key) throw new Error("AUTH_SECRET is not configured");
  return key;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", signingKey()).update(body).digest("base64url");
}

function encodeState(userId: number): string {
  const payload: StripeConnectOAuthState = {
    userId,
    kind: "stripe_connect",
    exp: Date.now() + OAUTH_STATE_TTL_MS,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeStripeConnectState(raw: string): StripeConnectOAuthState | null {
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(body);
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

export function getStripeConnectClientId(): string | null {
  const value = process.env.STRIPE_CONNECT_CLIENT_ID?.trim();
  return value || null;
}

export function stripeConnectOAuthAvailable(): boolean {
  return Boolean(getStripeConnectClientId());
}

export function stripeConnectRedirectUri(): string {
  return `${getNextApiOrigin()}/api/admin/stripe-connect/callback`;
}

function envTrim(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

async function loadBootstrapSecret(): Promise<string | null> {
  const fromEnv = envTrim("STRIPE_SECRET_KEY");
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

export type StripeConnectTokenResponse = {
  access_token: string;
  refresh_token?: string;
  stripe_user_id: string;
  livemode: boolean;
  scope?: string;
  token_type?: string;
};

export async function exchangeStripeConnectCode(
  code: string,
): Promise<StripeConnectTokenResponse> {
  const clientId = getStripeConnectClientId();
  if (!clientId) throw new Error("Stripe Connect is not configured");

  const clientSecret = await loadBootstrapSecret();
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

export async function clearStripeConnectTokens(updatedBy: number): Promise<void> {
  await db
    .insert(platformSettingsTable)
    .values({
      id: 1,
      encryptedStripeConnectAccessToken: null,
      encryptedStripeConnectRefreshToken: null,
      stripeConnectAccountId: null,
      stripeConnectLivemode: null,
      stripeConnectConnectedAt: null,
      updatedBy,
    })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: {
        encryptedStripeConnectAccessToken: null,
        encryptedStripeConnectRefreshToken: null,
        stripeConnectAccountId: null,
        stripeConnectLivemode: null,
        stripeConnectConnectedAt: null,
        updatedBy,
      },
    });

  invalidateStripeClientCache();
}

export async function deauthorizeStripeConnectAccount(accountId: string): Promise<void> {
  const clientId = getStripeConnectClientId();
  const clientSecret = await loadBootstrapSecret();
  if (!clientId || !clientSecret) return;

  const body = new URLSearchParams({
    client_id: clientId,
    stripe_user_id: accountId,
    client_secret: clientSecret,
  });

  await fetch("https://connect.stripe.com/oauth/deauthorize", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }).catch(() => undefined);
}

export function startStripeConnectOAuth(userId: number): never {
  const clientId = getStripeConnectClientId();
  if (!clientId) {
    redirect("/admin/integrations?stripe=connect_unconfigured");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: stripeConnectRedirectUri(),
    state: encodeState(userId),
  });

  redirect(`https://connect.stripe.com/oauth/authorize?${params.toString()}`);
}

export function adminIntegrationsRedirect(params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/admin/integrations?${qs}`);
}
