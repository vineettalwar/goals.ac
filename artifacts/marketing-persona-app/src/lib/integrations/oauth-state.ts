import crypto from "crypto";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface SignedOAuthPayload {
  projectId: number;
  userId: number;
  platform: string;
  exp: number;
  nonce: string;
  codeVerifier?: string;
  mastodonToken?: string;
  mastodonInstance?: string;
  mastodonClientId?: string;
  provider?: string;
}

function signingKey(): string {
  const key = process.env.AUTH_SECRET;
  if (!key) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return key;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", signingKey()).update(body).digest("base64url");
}

function verifySignature(body: string, sig: string): boolean {
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function encodeSignedOAuthState(
  payload: Omit<SignedOAuthPayload, "exp" | "nonce"> &
    Partial<Pick<SignedOAuthPayload, "codeVerifier" | "mastodonToken" | "mastodonInstance" | "mastodonClientId" | "provider">>,
): string {
  const full: SignedOAuthPayload = {
    ...payload,
    exp: Date.now() + OAUTH_STATE_TTL_MS,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSignedOAuthState<T extends SignedOAuthPayload = SignedOAuthPayload>(
  raw: string,
): T | null {
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verifySignature(body, sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.projectId !== "number" || typeof payload.userId !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function assertOAuthSessionUser(expectedUserId: number): Promise<number> {
  const { requireAuth } = await import("@/lib/auth/require-auth");
  const { userId, error } = await requireAuth({ skipMfaCheck: true });
  if (error || userId === null) {
    throw new Error("Unauthorized OAuth callback");
  }
  if (userId !== expectedUserId) {
    throw new Error("OAuth state does not match session");
  }
  return userId;
}
