import express, {
  type Express,
  type RequestHandler,
} from "express";
import { randomUUID } from "node:crypto";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { httpErrorHandler, notFoundHandler } from "./lib/httpError";

const app: Express = express();

app.disable("x-powered-by");
if (process.env["NODE_ENV"] === "production") {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    genReqId(req, res) {
      const incomingId = req.headers["x-request-id"];
      const requestId =
        typeof incomingId === "string" && /^[a-zA-Z0-9._-]{1,128}$/.test(incomingId)
          ? incomingId
          : randomUUID();
      res.setHeader("x-request-id", requestId);
      return requestId;
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Cookie-based auth requires credentials: true, which the CORS spec forbids
// pairing with a wildcard origin — reflecting *any* origin (the previous
// `origin: true`) is effectively the same foot-gun, since it lets any site
// make credentialed requests. Allow only this app's known origins instead.
function resolveAllowedOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [/^https?:\/\/localhost:\d+$/, /^https?:\/\/127\.0\.0\.1:\d+$/];

  const explicitOrigin = process.env["APP_ORIGIN"];
  if (explicitOrigin) {
    for (const origin of explicitOrigin.split(",")) {
      const normalizedOrigin = origin.trim().replace(/\/$/, "");
      if (normalizedOrigin) origins.push(normalizedOrigin);
    }
  } else if (process.env["NODE_ENV"] === "production") {
    throw new Error("APP_ORIGIN is required in production.");
  }

  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) origins.push(`https://${devDomain}`);

  return origins;
}

app.use(helmet());
app.use(cors({ origin: resolveAllowedOrigins(), credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: process.env["REQUEST_BODY_LIMIT"] ?? "1mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env["REQUEST_BODY_LIMIT"] ?? "1mb",
  }),
);

const apiRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env["RATE_LIMIT_MAX"] ?? 300),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path === "/healthz" || req.path === "/readyz",
});

app.use("/api", apiRateLimiter, router);

app.use(notFoundHandler);
app.use(httpErrorHandler);

export default app;
