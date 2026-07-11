import crypto from "crypto";
import type { Request } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function clientIp(req: Request): string | null {
  return req.ip ?? null;
}

function clientUserAgent(req: Request): string | null {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : null;
}

export interface CreatedSession {
  refreshToken: string;
  expiresAt: Date;
}

/** Creates a new session row and returns the raw (unhashed) refresh token — the hash is what's persisted. */
export async function createSession(userId: number, req: Request): Promise<CreatedSession> {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await db.insert(sessionsTable).values({
    userId,
    refreshTokenHash,
    userAgent: clientUserAgent(req),
    ip: clientIp(req),
    expiresAt,
  });

  return { refreshToken, expiresAt };
}

/** Marks every active (unrevoked) session for a user as revoked — used on password change/reset. */
export async function revokeAllUserSessions(userId: number): Promise<void> {
  await db
    .update(sessionsTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessionsTable.userId, userId), isNull(sessionsTable.revokedAt)));
}

/** Revokes the single session identified by a raw refresh token (used on logout). */
export async function revokeSessionByRefreshToken(rawToken: string): Promise<void> {
  const hash = hashRefreshToken(rawToken);
  await db.update(sessionsTable).set({ revokedAt: new Date() }).where(eq(sessionsTable.refreshTokenHash, hash));
}

export type RotateSessionResult =
  | { status: "ok"; userId: number; refreshToken: string }
  | { status: "reuse_detected"; userId: number }
  | { status: "invalid" };

/**
 * Verifies and rotates a refresh token in a single guarded UPDATE: the WHERE
 * clause matches on the *old* hash, so if two requests race on the same
 * refresh token, only one UPDATE affects a row — the loser's presented hash
 * no longer matches anything post-rotation and it falls through to "invalid".
 *
 * If the presented token matches a session that is already revoked, that's a
 * sign the (rotated-away) refresh token is being replayed — e.g. it leaked
 * and both the legitimate client and an attacker are now racing to use the
 * stale value. Treat that as compromise and revoke every session for the user.
 */
export async function rotateSession(rawToken: string, req: Request): Promise<RotateSessionResult> {
  const presentedHash = hashRefreshToken(rawToken);

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.refreshTokenHash, presentedHash))
    .limit(1);

  if (!session) {
    return { status: "invalid" };
  }

  if (session.revokedAt) {
    await revokeAllUserSessions(session.userId);
    return { status: "reuse_detected", userId: session.userId };
  }

  if (session.expiresAt.getTime() < Date.now()) {
    return { status: "invalid" };
  }

  const newRefreshToken = generateRefreshToken();
  const newHash = hashRefreshToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const updated = await db
    .update(sessionsTable)
    .set({
      refreshTokenHash: newHash,
      expiresAt: newExpiresAt,
      lastUsedAt: new Date(),
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
    })
    .where(and(eq(sessionsTable.id, session.id), eq(sessionsTable.refreshTokenHash, presentedHash)))
    .returning({ id: sessionsTable.id });

  if (updated.length === 0) {
    // Lost the race to a concurrent rotation that used the same old hash.
    return { status: "invalid" };
  }

  return { status: "ok", userId: session.userId, refreshToken: newRefreshToken };
}
