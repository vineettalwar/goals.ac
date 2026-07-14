import pino, { type Logger } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const inNextJs = Boolean(process.env.NEXT_RUNTIME);

declare global {
  // eslint-disable-next-line no-var -- singleton survives Next.js/Turbopack HMR reloads
  var __goalsAcPinoLogger: Logger | undefined;
}

function createLogger(): Logger {
  const base = {
    level: process.env.LOG_LEVEL ?? "info",
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
  };

  // pino-pretty worker transport pipes to stdout; Next.js evaluates logger
  // modules in multiple bundles and triggers MaxListenersExceededWarning.
  if (isProduction || inNextJs) {
    return pino(base);
  }

  return pino({
    ...base,
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });
}

export const logger = globalThis.__goalsAcPinoLogger ?? createLogger();

if (!isProduction) {
  globalThis.__goalsAcPinoLogger = logger;
}
