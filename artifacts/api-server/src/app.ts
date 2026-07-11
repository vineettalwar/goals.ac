import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
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
  if (explicitOrigin) origins.push(explicitOrigin);

  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) origins.push(`https://${devDomain}`);

  return origins;
}

app.use(cors({ origin: resolveAllowedOrigins(), credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
