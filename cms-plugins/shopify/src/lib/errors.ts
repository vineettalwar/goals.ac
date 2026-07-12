import type { ErrorRequestHandler, RequestHandler } from "express";
import { randomUUID } from "node:crypto";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly expose = status < 500,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

function log(level: "info" | "warn" | "error", message: string, fields: Record<string, unknown>): void {
  const entry = JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: "goals-ac-shopify",
    message,
    ...fields,
  });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.info)(entry);
}

export const requestContext: RequestHandler = (req, res, next) => {
  const supplied = req.header("x-request-id");
  req.requestId = supplied && /^[a-zA-Z0-9._-]{1,128}$/.test(supplied)
    ? supplied
    : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
};

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `Route ${req.method} ${req.path} was not found`));
};

function normalize(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof SyntaxError && (error as SyntaxError & { status?: number }).status === 400) {
    return new AppError(400, "MALFORMED_JSON", "Malformed JSON request body", true, { cause: error });
  }
  return new AppError(500, "INTERNAL_ERROR", "Internal server error", false, { cause: error });
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const normalized = normalize(error);
  const cause = error instanceof Error ? error : new Error(String(error));

  log(normalized.status >= 500 ? "error" : "warn", "Request failed", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    status: normalized.status,
    code: normalized.code,
    errorName: cause.name,
    errorMessage: cause.message,
    ...(process.env.NODE_ENV !== "production" ? { stack: cause.stack } : {}),
  });

  res.status(normalized.status).json({
    error: normalized.expose ? normalized.message : "Internal server error",
    code: normalized.code,
    requestId: req.requestId,
  });
};

export function badRequest(code: string, message: string): AppError {
  return new AppError(400, code, message);
}
