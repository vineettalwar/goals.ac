import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export type HttpErrorDetails = Record<string, unknown> | unknown[];

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: HttpErrorDetails;
  readonly expose: boolean;

  constructor(
    status: number,
    message: string,
    options: {
      code?: string;
      details?: HttpErrorDetails;
      expose?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "HttpError";
    this.status = status;
    this.code = options.code ?? defaultCode(status);
    this.details = options.details;
    this.expose = options.expose ?? status < 500;
  }
}

function defaultCode(status: number): string {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  return "INTERNAL_ERROR";
}

function isJsonParseError(error: unknown): boolean {
  if (!(error instanceof SyntaxError)) return false;
  const candidate = error as SyntaxError & { status?: number; type?: string };
  return candidate.status === 400 && candidate.type === "entity.parse.failed";
}

function isPayloadTooLargeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: number; type?: string };
  return candidate.status === 413 || candidate.type === "entity.too.large";
}

function normalizeError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;

  if (error instanceof ZodError) {
    return new HttpError(400, "Request validation failed", {
      code: "VALIDATION_ERROR",
      details: error.issues.map(({ path, message, code }) => ({ path, message, code })),
      cause: error,
    });
  }

  if (isJsonParseError(error)) {
    return new HttpError(400, "Malformed JSON request body", {
      code: "MALFORMED_JSON",
      cause: error,
    });
  }

  if (isPayloadTooLargeError(error)) {
    return new HttpError(413, "Request body is too large", { cause: error });
  }

  return new HttpError(500, "Internal server error", {
    expose: false,
    cause: error,
  });
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new HttpError(404, `Route ${req.method} ${req.path} was not found`, {
      code: "ROUTE_NOT_FOUND",
    }),
  );
};

export const httpErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalized = normalizeError(error);
  const requestId = String(req.id ?? res.getHeader("x-request-id") ?? "unknown");
  const logContext = {
    err: error,
    requestId,
    errorCode: normalized.code,
    status: normalized.status,
  };

  if (normalized.status >= 500) {
    req.log.error(logContext, "Request failed");
  } else {
    req.log.warn(logContext, "Request rejected");
  }

  res.status(normalized.status).json({
    error: normalized.expose ? normalized.message : "Internal server error",
    code: normalized.code,
    requestId,
    ...(normalized.expose && normalized.details
      ? { details: normalized.details }
      : {}),
  });
};
