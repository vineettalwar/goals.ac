import { createHmac, createHash, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errors.js";

const HMAC_KEY = process.env.GOALS_AC_HMAC_KEY ?? process.env.GOALS_AC_SITE_KEY ?? "";
const NONCE_EXPIRY_SEC = 300;

export const GOALS_HEADERS = {
  timestamp: "x-goals-timestamp",
  nonce: "x-goals-nonce",
  signature: "x-goals-signature",
} as const;

const seenNonces = new Map<string, number>();

function cleanupNonces(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [nonce, expiresAt] of seenNonces) {
    if (expiresAt <= now) {
      seenNonces.delete(nonce);
    }
  }
}

setInterval(cleanupNonces, 60_000).unref();

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function canonicalize(method: string, path: string, timestamp: string, nonce: string, bodyHash: string): string {
  return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join("\n");
}

export function sign(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: string,
): string {
  const bodyHash = sha256(body);
  const message = canonicalize(method, path, timestamp, nonce, bodyHash);
  return createHmac("sha256", HMAC_KEY).update(message).digest("hex");
}

export function verifySignature(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
): boolean {
  const bodyHash = sha256(body);
  const message = canonicalize(method, path, timestamp, nonce, bodyHash);
  const expected = createHmac("sha256", HMAC_KEY).update(message).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
  } catch {
    return false;
  }
}

function getRawBody(req: Request): string {
  const rawBody = (req as Request & { rawBody?: string }).rawBody;
  if (typeof rawBody === "string") {
    return rawBody;
  }
  return req.method === "GET" || req.method === "HEAD" ? "" : JSON.stringify(req.body ?? "");
}

export function hmacAuth(req: Request, res: Response, next: NextFunction): void {
  if (!HMAC_KEY) {
    next(new AppError(500, "HMAC_NOT_CONFIGURED", "HMAC key not configured", false));
    return;
  }

  const timestamp = req.headers[GOALS_HEADERS.timestamp] as string | undefined;
  const nonce = req.headers[GOALS_HEADERS.nonce] as string | undefined;
  const signature = req.headers[GOALS_HEADERS.signature] as string | undefined;

  if (!timestamp || !nonce || !signature) {
    next(new AppError(401, "AUTH_HEADERS_MISSING", "Missing authentication headers"));
    return;
  }

  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > NONCE_EXPIRY_SEC) {
    next(new AppError(401, "AUTH_TIMESTAMP_EXPIRED", "Request timestamp expired"));
    return;
  }

  if (seenNonces.has(nonce)) {
    next(new AppError(401, "AUTH_NONCE_REUSED", "Nonce has already been used"));
    return;
  }

  const body = getRawBody(req);
  const path = req.baseUrl + req.path;

  if (!verifySignature(req.method, path, timestamp, nonce, body, signature)) {
    next(new AppError(401, "AUTH_SIGNATURE_INVALID", "Invalid signature"));
    return;
  }

  seenNonces.set(nonce, ts + NONCE_EXPIRY_SEC);
  next();
}
