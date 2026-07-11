import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction, CookieOptions } from "express";

const jwtSecretEnv = process.env["JWT_SECRET"];
if (!jwtSecretEnv && process.env["NODE_ENV"] === "production") {
  throw new Error("JWT_SECRET environment variable is required in production.");
}
const JWT_SECRET = jwtSecretEnv ?? "goals-ac-dev-secret-change-in-production";
const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

// Access tokens are short-lived and verified without a DB round-trip (see
// requireAuth below) — the 15-minute expiry is what bounds staleness (e.g. a
// since-revoked session or deleted user), not a per-request revocation check.
// Long-lived sessions are tracked separately via the refresh-token cookie
// and the `sessions` table.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
// Cookie `path` for the refresh token — restricts the browser to sending it
// only to auth endpoints (refresh + logout live under /api/auth), so it
// never rides along on ordinary API requests.
export const REFRESH_TOKEN_COOKIE_PATH = "/api/auth";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  };
}

export function setAccessTokenCookie(res: Response, accessToken: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });
}

export function setRefreshTokenCookie(res: Response, refreshToken: string, maxAgeMs: number): void {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: maxAgeMs,
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
}

/** Sets both the short-lived access-token cookie and the rotating refresh-token cookie. */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  refreshMaxAgeMs: number,
): void {
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken, refreshMaxAgeMs);
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseCookieOptions(), path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseCookieOptions(), path: REFRESH_TOKEN_COOKIE_PATH });
}

function extractCandidateTokens(req: Request): string[] {
  const candidates: string[] = [];

  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    candidates.push(authHeader.slice(7));
  }

  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (typeof cookieToken === "string" && cookieToken) {
    candidates.push(cookieToken);
  }

  return candidates;
}

// Tries the Authorization header first, then the access_token cookie —
// whichever verifies successfully wins. Trying both (rather than only the
// header when present) means a stale/placeholder Authorization header sent
// by an older client doesn't shadow a perfectly valid cookie.
function resolvePayload(req: Request): JwtPayload | null {
  for (const candidate of extractCandidateTokens(req)) {
    try {
      return verifyToken(candidate);
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const payload = resolvePayload(req);

  if (!payload) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  req.user = payload;
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const payload = resolvePayload(req);
  if (payload) {
    req.user = payload;
  }
  next();
}
